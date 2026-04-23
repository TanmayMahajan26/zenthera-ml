"""
Zenthera — Shared Genomic Feature Extraction Utilities
=======================================================
Reusable k-mer feature extraction used by both the training pipeline
and the prediction script.

Features per genome:
  - 16384 normalized 7-mer frequencies
  - GC content (fraction of G+C bases)
  - log10(genome_length) 
  - k-mer diversity (fraction of distinct k-mers observed)
  Total: 16387 features
"""

import numpy as np
from itertools import product
from collections import Counter
from typing import Optional

# ---------------------------------------------------------------------------
# Constants — these MUST stay identical between training and prediction
# ---------------------------------------------------------------------------
K = 7
NUCLEOTIDES = ["A", "C", "G", "T"]
ALL_KMERS = sorted(["".join(combo) for combo in product(NUCLEOTIDES, repeat=K)])
KMER_INDEX = {kmer: idx for idx, kmer in enumerate(ALL_KMERS)}
NUM_KMER_FEATURES = len(ALL_KMERS)  # 4^5 = 1024
NUM_EXTRA_FEATURES = 3              # GC content, log genome length, k-mer diversity
NUM_TOTAL_FEATURES = NUM_KMER_FEATURES + NUM_EXTRA_FEATURES  # 1027


def parse_fasta(filepath: str) -> str:
    """
    Parse a FASTA file and return the concatenated sequence (uppercase, ACGT only).
    Handles multi-record FASTA files.
    Returns empty string on failure.
    """
    sequences = []
    current_seq = []
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                if line.startswith(">"):
                    if current_seq:
                        sequences.append("".join(current_seq))
                        current_seq = []
                else:
                    cleaned = "".join(ch for ch in line.upper() if ch in "ACGT")
                    current_seq.append(cleaned)
            if current_seq:
                sequences.append("".join(current_seq))
    except Exception:
        return ""
    return "".join(sequences)


def extract_features(sequence: str) -> Optional[np.ndarray]:
    """
    Extract a fixed-size feature vector from a DNA sequence.

    Returns
    -------
    np.ndarray of shape (1027,) with dtype float32, or None if the sequence
    is too short / contains no valid k-mers.

    Features (in order):
        [0..1023]  Normalized 5-mer frequency vector
        [1024]     GC content  (G+C / total bases)
        [1025]     log10(genome length + 1)
        [1026]     k-mer diversity  (unique_kmers / 1024)
    """
    if len(sequence) < K:
        return None

    features = np.zeros(NUM_TOTAL_FEATURES, dtype=np.float32)

    # ---- k-mer counting ----
    kmer_counts: Counter = Counter()
    for i in range(len(sequence) - K + 1):
        kmer = sequence[i : i + K]
        if kmer in KMER_INDEX:
            kmer_counts[kmer] += 1

    total_kmers = sum(kmer_counts.values())
    if total_kmers == 0:
        return None

    # Normalize to frequencies
    for kmer, count in kmer_counts.items():
        features[KMER_INDEX[kmer]] = count / total_kmers

    # ---- extra genomic features ----
    gc_count = sequence.count("G") + sequence.count("C")
    features[NUM_KMER_FEATURES]     = gc_count / len(sequence)         # GC content
    features[NUM_KMER_FEATURES + 1] = np.log10(len(sequence) + 1)      # Log genome length
    features[NUM_KMER_FEATURES + 2] = len(kmer_counts) / NUM_KMER_FEATURES  # K-mer diversity

    return features
