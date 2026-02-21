#!/usr/bin/env python3
"""
Quick verification that the eval system is set up correctly.
Run this before running full evals.
"""

import json
import sys
from pathlib import Path

def main():
    evals_dir = Path(__file__).parent
    
    print("Verifying Pathfinder eval setup...\n")
    
    # Check 1: test_cases.json exists and is valid
    test_cases_path = evals_dir / "test_cases.json"
    print(f"1. Checking test_cases.json...")
    
    if not test_cases_path.exists():
        print(f"   ✗ FAIL: {test_cases_path} not found")
        sys.exit(1)
    
    try:
        with open(test_cases_path) as f:
            data = json.load(f)
        
        cases = data.get("test_cases", [])
        print(f"   ✓ Found {len(cases)} test cases")
        
        # Breakdown by category
        categories = {}
        for case in cases:
            cat = case.get("category", "unknown")
            categories[cat] = categories.get(cat, 0) + 1
        
        for cat, count in categories.items():
            print(f"      - {cat}: {count}")
        
    except json.JSONDecodeError as e:
        print(f"   ✗ FAIL: Invalid JSON: {e}")
        sys.exit(1)
    
    # Check 2: run_evals.py can be imported
    print(f"\n2. Checking run_evals.py imports...")
    try:
        from run_evals import load_test_cases, run_automatic_evals
        print(f"   ✓ Core functions importable")
    except ImportError as e:
        print(f"   ✗ FAIL: Import error: {e}")
        print(f"   Make sure you have 'requests' installed: pip install requests")
        sys.exit(1)
    
    # Check 3: Results directory exists
    print(f"\n3. Checking results directory...")
    results_dir = evals_dir / "results"
    if results_dir.exists():
        print(f"   ✓ Results directory exists")
    else:
        print(f"   Creating results directory...")
        results_dir.mkdir(exist_ok=True)
        print(f"   ✓ Created")
    
    # Check 4: Verify test case structure
    print(f"\n4. Validating test case structure...")
    required_fields = ["id", "name", "user_text"]
    issues = []
    
    for case in cases:
        for field in required_fields:
            if field not in case:
                issues.append(f"Case {case.get('id', '?')}: missing '{field}'")
    
    if issues:
        print(f"   ✗ FAIL: Structure issues found:")
        for issue in issues[:5]:
            print(f"      - {issue}")
        sys.exit(1)
    else:
        print(f"   ✓ All test cases have required fields")
    
    print(f"\n{'='*50}")
    print(f"✓ Setup verification complete!")
    print(f"{'='*50}")
    print(f"\nNext steps:")
    print(f"  1. Start the API:  uvicorn app.main:app --reload")
    print(f"  2. Run evals:      python evals/run_evals.py")
    print(f"  3. Or quick test:  python evals/run_evals.py --case tc_001 --auto-only")


if __name__ == "__main__":
    main()
