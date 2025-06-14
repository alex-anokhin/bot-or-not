#!/usr/bin/env python3
"""Development runner for Bot or Not game."""

import os
import sys
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from bot_or_not.main import main

if __name__ == "__main__":
    main()
