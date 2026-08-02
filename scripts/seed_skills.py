#!/usr/bin/env python3
"""
Seed skills into the Lucineer Vector index via the Worker API.
Usage: python3 seed_skills.py skills_batch2.json
"""
import json, sys, subprocess

WORKER_URL = "https://lucineer-vector.casey-digennaro.workers.dev"

def seed(filepath):
    with open(filepath) as f:
        skills = json.load(f)
    
    print(f"Seeding {len(skills)} skills to {WORKER_URL}/api/skills/seed ...")
    body = json.dumps(skills)
    
    result = subprocess.run(
        ['curl', '-s', '-X', 'POST',
         '-H', 'Content-Type: application/json',
         '-d', body,
         f'{WORKER_URL}/api/skills/seed'],
        capture_output=True, text=True, timeout=120
    )
    
    try:
        resp = json.loads(result.stdout)
        print(f"✅ {json.dumps(resp, indent=2)}")
    except:
        print(f"Response: {result.stdout[:500]}")
        if result.stderr:
            print(f"Stderr: {result.stderr[:500]}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 seed_skills.py <skills_json_file>")
        sys.exit(1)
    seed(sys.argv[1])
