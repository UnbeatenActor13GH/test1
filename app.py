#!/usr/bin/env python3
"""A simple command-line app script.

This script asks for a user's name and prints a personalized greeting.
"""


def main() -> None:
    name = input("What's your name? ").strip()
    if not name:
        name = "there"
    print(f"Hello, {name}! Welcome to your simple app script.")


if __name__ == "__main__":
    main()
