"""
Genomic Data Fetcher for Antibiotic Resistance Prediction
==========================================================
Downloads real genomic FASTA files and AMR labels from:
  - BV-BRC (Bacterial and Viral Bioinformatics Research Center)
  - NCBI (National Center for Biotechnology Information)

The output is a directory of FASTA files + a labels CSV, ready to be
fed into antibiotic_resistance_predictor.py

Usage:
    python fetch_genomic_data.py
    python fetch_genomic_data.py --samples_per_class 30 --output_dir ./genome_data
    python fetch_genomic_data.py --antibiotics Ciprofloxacin Rifampicin --samples_per_class 50
"""

import os
import sys
import csv
import json
import time
import argparse
import logging
import urllib.request
import urllib.parse
import urllib.error
from typing import Dict, List, Optional, Tuple

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
BVBRC_API_BASE = "https://www.bv-brc.org/api"

# NCBI Entrez endpoints
NCBI_ESEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
NCBI_EFETCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
NCBI_EMAIL = "zenthera_research@example.com"  # Required by NCBI policy

SUPPORTED_ANTIBIOTICS = ["Ciprofloxacin", "Amoxicillin", "Rifampicin"]
PHENOTYPES = ["Resistant", "Susceptible"]

# Rate-limit: seconds between API requests
BVBRC_DELAY = 0.5
NCBI_DELAY = 0.4  # NCBI allows ~3 req/s without API key

# Retry settings
MAX_RETRIES = 3
RETRY_DELAY = 5


# ============================================================================
# UTILITY — HTTP requests with retries
# ============================================================================
def http_get(url: str, accept: str = "application/json", timeout: int = 60) -> Optional[bytes]:
    """
    Perform an HTTP GET with retries and return raw bytes.
    """
    headers = {"Accept": accept, "User-Agent": "Zenthera-Genomic-Fetcher/1.0"}
    req = urllib.request.Request(url, headers=headers)

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            logger.warning(f"  HTTP {e.code} on attempt {attempt}/{MAX_RETRIES}: {url}")
            if e.code == 429 or e.code >= 500:
                time.sleep(RETRY_DELAY * attempt)
            else:
                return None
        except urllib.error.URLError as e:
            logger.warning(f"  URL error on attempt {attempt}/{MAX_RETRIES}: {e.reason}")
            time.sleep(RETRY_DELAY * attempt)
        except Exception as e:
            logger.warning(f"  Error on attempt {attempt}/{MAX_RETRIES}: {e}")
            time.sleep(RETRY_DELAY * attempt)

    logger.error(f"  Failed after {MAX_RETRIES} attempts: {url}")
    return None


def http_get_json(url: str) -> Optional[list]:
    """GET request returning parsed JSON (expects a list)."""
    data = http_get(url, accept="application/json")
    if data is None:
        return None
    try:
        return json.loads(data.decode("utf-8"))
    except json.JSONDecodeError as e:
        logger.error(f"  JSON decode error: {e}")
        return None


# ============================================================================
# 1. BV-BRC DATA FETCHING
# ============================================================================
class BVBRCFetcher:
    """Fetch AMR metadata and genome FASTA files from BV-BRC."""

    def __init__(self, output_dir: str):
        self.fasta_dir = os.path.join(output_dir, "fasta_files")
        os.makedirs(self.fasta_dir, exist_ok=True)

    def query_amr_records(
        self, antibiotic: str, phenotype: str, limit: int = 50
    ) -> List[Dict]:
        """
        Query the BV-BRC genome_amr collection for records matching
        a given antibiotic and resistance phenotype.

        Returns a list of record dicts with keys like:
            genome_id, genome_name, antibiotic, resistant_phenotype, evidence, ...
        """
        # BV-BRC uses lowercase antibiotic names in some entries
        url = (
            f"{BVBRC_API_BASE}/genome_amr/"
            f"?eq(antibiotic,{urllib.parse.quote(antibiotic.lower())})"
            f"&eq(resistant_phenotype,{urllib.parse.quote(phenotype)})"
            f"&limit({limit})"
            f"&select(genome_id,genome_name,antibiotic,resistant_phenotype,evidence)"
            f"&http_accept=application/json"
        )

        logger.info(f"  BV-BRC query: {antibiotic} / {phenotype} (limit={limit})")
        records = http_get_json(url)
        time.sleep(BVBRC_DELAY)

        if records is None:
            logger.warning(f"  No response from BV-BRC for {antibiotic}/{phenotype}")
            return []

        logger.info(f"  Got {len(records)} records from BV-BRC")

        # Deduplicate by genome_id
        seen = set()
        unique = []
        for r in records:
            gid = r.get("genome_id")
            if gid and gid not in seen:
                seen.add(gid)
                unique.append(r)
        return unique

    def download_genome_fasta(self, genome_id: str) -> Optional[str]:
        """
        Download the genome FASTA (contigs) for a given BV-BRC genome_id.
        Returns the local file path if successful, None otherwise.
        """
        safe_id = genome_id.replace("/", "_")
        filename = f"BVBRC_{safe_id}.fasta"
        filepath = os.path.join(self.fasta_dir, filename)

        # Skip if already downloaded
        if os.path.isfile(filepath) and os.path.getsize(filepath) > 100:
            logger.info(f"    [cached] {filename}")
            return filename

        # BV-BRC genome FASTA download endpoint
        url = (
            f"{BVBRC_API_BASE}/genome_sequence/"
            f"?eq(genome_id,{urllib.parse.quote(genome_id)})"
            f"&http_accept=application/dna+fasta"
        )

        data = http_get(url, accept="application/dna+fasta", timeout=120)
        time.sleep(BVBRC_DELAY)

        if data is None or len(data) < 50:
            logger.warning(f"    Empty/failed FASTA download for {genome_id}")
            return None

        with open(filepath, "wb") as f:
            f.write(data)

        size_kb = os.path.getsize(filepath) / 1024
        logger.info(f"    Downloaded {filename} ({size_kb:.1f} KB)")
        return filename

    def fetch_for_antibiotic(
        self, antibiotic: str, samples_per_class: int
    ) -> List[Dict]:
        """
        Fetch both Resistant and Susceptible genomes for one antibiotic.
        Returns list of dicts with: sample_id, fasta_file, antibiotic, resistance
        """
        results = []

        for phenotype in PHENOTYPES:
            # Request extra to compensate for download failures
            query_limit = samples_per_class * 3
            records = self.query_amr_records(antibiotic, phenotype, limit=query_limit)

            count = 0
            for rec in records:
                if count >= samples_per_class:
                    break

                genome_id = rec.get("genome_id")
                if not genome_id:
                    continue

                filename = self.download_genome_fasta(genome_id)
                if filename is None:
                    continue

                results.append({
                    "sample_id": f"BVBRC_{genome_id}",
                    "fasta_file": filename,
                    "antibiotic": antibiotic.capitalize(),
                    "resistance": phenotype,
                    "source": "BV-BRC",
                    "genome_name": rec.get("genome_name", ""),
                })
                count += 1

            logger.info(
                f"  BV-BRC {antibiotic}/{phenotype}: "
                f"downloaded {count}/{samples_per_class} genomes"
            )

        return results


# ============================================================================
# 2. NCBI DATA FETCHING
# ============================================================================
class NCBIFetcher:
    """
    Fetch antibiotic-resistant genome data from NCBI.

    Strategy: Search the NCBI Nucleotide database for bacterial genomes
    associated with antibiotic resistance genes / phenotypes, then download
    their FASTA sequences using Entrez efetch.
    """

    # Map antibiotics to relevant resistance gene search terms in NCBI
    RESISTANCE_SEARCH_TERMS = {
        "Ciprofloxacin": {
            "Resistant": (
                '("Escherichia coli"[Organism] OR "Klebsiella pneumoniae"[Organism]) '
                'AND (gyrA OR parC OR "quinolone resistance") '
                'AND "complete genome"[Title]'
            ),
            "Susceptible": (
                '("Escherichia coli"[Organism] OR "Klebsiella pneumoniae"[Organism]) '
                'AND "complete genome"[Title] '
                'NOT "quinolone resistance"'
            ),
        },
        "Amoxicillin": {
            "Resistant": (
                '("Escherichia coli"[Organism] OR "Staphylococcus aureus"[Organism]) '
                'AND (blaTEM OR blaOXA OR "beta-lactamase") '
                'AND "complete genome"[Title]'
            ),
            "Susceptible": (
                '("Escherichia coli"[Organism] OR "Staphylococcus aureus"[Organism]) '
                'AND "complete genome"[Title] '
                'NOT "beta-lactamase"'
            ),
        },
        "Rifampicin": {
            "Resistant": (
                '("Mycobacterium tuberculosis"[Organism]) '
                'AND (rpoB OR "rifampicin resistance") '
                'AND "complete genome"[Title]'
            ),
            "Susceptible": (
                '("Mycobacterium tuberculosis"[Organism]) '
                'AND "complete genome"[Title] '
                'NOT "rifampicin resistance"'
            ),
        },
    }

    def __init__(self, output_dir: str, email: str = NCBI_EMAIL):
        self.email = email
        self.fasta_dir = os.path.join(output_dir, "fasta_files")
        os.makedirs(self.fasta_dir, exist_ok=True)

    def search_ids(self, query: str, max_results: int = 20) -> List[str]:
        """Search NCBI Nucleotide database and return a list of accession IDs."""
        params = urllib.parse.urlencode({
            "db": "nucleotide",
            "term": query,
            "retmax": max_results,
            "retmode": "json",
            "email": self.email,
            "usehistory": "n",
        })
        url = f"{NCBI_ESEARCH}?{params}"

        data = http_get(url)
        time.sleep(NCBI_DELAY)

        if data is None:
            return []

        try:
            result = json.loads(data.decode("utf-8"))
            id_list = result.get("esearchresult", {}).get("idlist", [])
            logger.info(f"    NCBI search returned {len(id_list)} IDs")
            return id_list
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"    NCBI search parse error: {e}")
            return []

    def download_fasta(self, ncbi_id: str) -> Optional[str]:
        """Download a FASTA record from NCBI by nucleotide ID."""
        filename = f"NCBI_{ncbi_id}.fasta"
        filepath = os.path.join(self.fasta_dir, filename)

        # Skip if cached
        if os.path.isfile(filepath) and os.path.getsize(filepath) > 100:
            logger.info(f"    [cached] {filename}")
            return filename

        params = urllib.parse.urlencode({
            "db": "nucleotide",
            "id": ncbi_id,
            "rettype": "fasta",
            "retmode": "text",
            "email": self.email,
        })
        url = f"{NCBI_EFETCH}?{params}"

        data = http_get(url, accept="text/plain", timeout=120)
        time.sleep(NCBI_DELAY)

        if data is None or len(data) < 50:
            logger.warning(f"    Empty FASTA from NCBI for ID {ncbi_id}")
            return None

        with open(filepath, "wb") as f:
            f.write(data)

        size_kb = os.path.getsize(filepath) / 1024
        logger.info(f"    Downloaded {filename} ({size_kb:.1f} KB)")
        return filename

    def fetch_for_antibiotic(
        self, antibiotic: str, samples_per_class: int
    ) -> List[Dict]:
        """
        Fetch resistant and susceptible genomes from NCBI for one antibiotic.
        """
        results = []
        search_terms = self.RESISTANCE_SEARCH_TERMS.get(antibiotic, {})

        if not search_terms:
            logger.warning(f"  No NCBI search terms configured for {antibiotic}")
            return results

        for phenotype in PHENOTYPES:
            query = search_terms.get(phenotype, "")
            if not query:
                continue

            logger.info(f"  NCBI search: {antibiotic} / {phenotype}")
            ids = self.search_ids(query, max_results=samples_per_class * 2)

            count = 0
            for ncbi_id in ids:
                if count >= samples_per_class:
                    break

                filename = self.download_fasta(ncbi_id)
                if filename is None:
                    continue

                results.append({
                    "sample_id": f"NCBI_{ncbi_id}",
                    "fasta_file": filename,
                    "antibiotic": antibiotic.capitalize(),
                    "resistance": phenotype,
                    "source": "NCBI",
                    "genome_name": "",
                })
                count += 1

            logger.info(
                f"  NCBI {antibiotic}/{phenotype}: "
                f"downloaded {count}/{samples_per_class} genomes"
            )

        return results


# ============================================================================
# 3. MAIN PIPELINE
# ============================================================================
def write_labels_csv(records: List[Dict], output_path: str):
    """Write the combined labels CSV from all fetched records."""
    fieldnames = [
        "sample_id", "fasta_file", "antibiotic", "resistance", "source", "genome_name"
    ]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    logger.info(f"Labels CSV written: {output_path}  ({len(records)} rows)")


def print_summary(records: List[Dict]):
    """Print a summary table of fetched data."""
    print("\n" + "=" * 75)
    print(f"{'Source':<10} {'Antibiotic':<18} {'Phenotype':<14} {'Count':>6}")
    print("-" * 75)

    # Group and count
    from collections import Counter
    counts = Counter()
    for r in records:
        key = (r["source"], r["antibiotic"], r["resistance"])
        counts[key] += 1

    for (source, ab, pheno), cnt in sorted(counts.items()):
        print(f"{source:<10} {ab:<18} {pheno:<14} {cnt:>6}")

    print("-" * 75)
    print(f"{'TOTAL':<10} {'':<18} {'':<14} {len(records):>6}")
    print("=" * 75)


def main():
    parser = argparse.ArgumentParser(
        description="Fetch real genomic data for antibiotic resistance prediction.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python fetch_genomic_data.py
  python fetch_genomic_data.py --samples_per_class 30
  python fetch_genomic_data.py --antibiotics Ciprofloxacin Rifampicin
  python fetch_genomic_data.py --sources bvbrc ncbi --output_dir ./my_data
        """,
    )
    parser.add_argument(
        "--antibiotics",
        nargs="+",
        default=SUPPORTED_ANTIBIOTICS,
        help=f"Antibiotics to fetch data for (default: {SUPPORTED_ANTIBIOTICS})",
    )
    parser.add_argument(
        "--samples_per_class",
        type=int,
        default=25,
        help="Number of genomes per class (Resistant/Susceptible) per antibiotic per source (default: 25)",
    )
    parser.add_argument(
        "--sources",
        nargs="+",
        default=["bvbrc", "ncbi"],
        choices=["bvbrc", "ncbi"],
        help="Data sources to fetch from (default: bvbrc ncbi)",
    )
    parser.add_argument(
        "--output_dir",
        default="./genome_data",
        help="Output directory (default: ./genome_data)",
    )

    args = parser.parse_args()
    os.makedirs(args.output_dir, exist_ok=True)

    logger.info("=" * 60)
    logger.info("  Zenthera — Genomic Data Fetcher")
    logger.info("=" * 60)
    logger.info(f"  Antibiotics       : {args.antibiotics}")
    logger.info(f"  Samples per class : {args.samples_per_class}")
    logger.info(f"  Sources           : {args.sources}")
    logger.info(f"  Output directory  : {args.output_dir}")
    logger.info("=" * 60)

    all_records: List[Dict] = []

    # ---- BV-BRC ----
    if "bvbrc" in args.sources:
        logger.info("\n>>> Fetching from BV-BRC ...")
        bvbrc = BVBRCFetcher(args.output_dir)
        for antibiotic in args.antibiotics:
            records = bvbrc.fetch_for_antibiotic(antibiotic, args.samples_per_class)
            all_records.extend(records)

    # ---- NCBI ----
    if "ncbi" in args.sources:
        logger.info("\n>>> Fetching from NCBI ...")
        ncbi = NCBIFetcher(args.output_dir)
        for antibiotic in args.antibiotics:
            records = ncbi.fetch_for_antibiotic(antibiotic, args.samples_per_class)
            all_records.extend(records)

    # ---- Write labels CSV ----
    if not all_records:
        logger.error("No data was fetched. Check your internet connection and try again.")
        sys.exit(1)

    csv_path = os.path.join(args.output_dir, "labels.csv")
    write_labels_csv(all_records, csv_path)

    # ---- Summary ----
    print_summary(all_records)

    fasta_dir = os.path.join(args.output_dir, "fasta_files")
    print(f"\nData ready! To train models, run:")
    print(f"  python antibiotic_resistance_predictor.py \\")
    print(f"      --csv {csv_path} \\")
    print(f"      --fasta_dir {fasta_dir}")
    print()


if __name__ == "__main__":
    main()
