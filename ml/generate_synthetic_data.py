"""
Generate Synthetic FASTA Data for Testing
==========================================
Creates fake genomic FASTA files and a labels CSV so you can test
the antibiotic_resistance_predictor.py pipeline end-to-end without
needing real BV-BRC / NCBI / PATRIC data.

Usage:
    python generate_synthetic_data.py --num_samples 200 --output_dir ./synthetic_data
"""

import os
import random
import argparse
import csv

NUCLEOTIDES = "ACGT"
ANTIBIOTICS = ["Ciprofloxacin", "Amoxicillin", "Rifampicin"]
LABELS = ["Resistant", "Susceptible"]
SEQUENCE_LENGTH = 50_000  # 50 kb per sample (realistic contig size)


def generate_fasta(filepath: str, sample_id: str, seq_length: int = SEQUENCE_LENGTH):
    """Generate a synthetic FASTA file with random nucleotide sequence."""
    sequence = "".join(random.choices(NUCLEOTIDES, k=seq_length))

    with open(filepath, "w") as f:
        f.write(f">{sample_id} synthetic genome sequence\n")
        # Write in lines of 80 characters (standard FASTA format)
        for i in range(0, len(sequence), 80):
            f.write(sequence[i : i + 80] + "\n")


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic FASTA test data.")
    parser.add_argument("--num_samples", type=int, default=200, help="Number of samples to generate.")
    parser.add_argument("--output_dir", default="./synthetic_data", help="Output directory.")
    parser.add_argument("--seq_length", type=int, default=SEQUENCE_LENGTH, help="Sequence length per sample.")
    args = parser.parse_args()

    fasta_dir = os.path.join(args.output_dir, "fasta_files")
    os.makedirs(fasta_dir, exist_ok=True)

    csv_path = os.path.join(args.output_dir, "labels.csv")
    rows = []

    for i in range(1, args.num_samples + 1):
        sample_id = f"SAMPLE_{i:04d}"
        filename = f"{sample_id}.fasta"
        filepath = os.path.join(fasta_dir, filename)

        antibiotic = random.choice(ANTIBIOTICS)
        label = random.choice(LABELS)

        generate_fasta(filepath, sample_id, args.seq_length)
        rows.append(
            {
                "sample_id": sample_id,
                "fasta_file": filename,
                "antibiotic": antibiotic,
                "resistance": label,
            }
        )

        if i % 50 == 0 or i == args.num_samples:
            print(f"  Generated {i}/{args.num_samples} samples ...")

    with open(csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["sample_id", "fasta_file", "antibiotic", "resistance"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nDone! Generated {args.num_samples} synthetic samples.")
    print(f"  FASTA dir : {fasta_dir}")
    print(f"  Labels CSV: {csv_path}")
    print(f"\nTo run the pipeline:")
    print(f"  python antibiotic_resistance_predictor.py --csv {csv_path} --fasta_dir {fasta_dir}")


if __name__ == "__main__":
    main()
