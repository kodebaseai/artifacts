#!/usr/bin/env python3

"""
get-initiative-context.py
Generate comprehensive context for an initiative by aggregating all its milestones and issues

Usage:
    python get-initiative-context.py <initiative-id>
    python get-initiative-context.py A
    python get-initiative-context.py B --include-completion-analysis
"""

import sys
import os
import subprocess
import argparse
from pathlib import Path

def run_command(cmd, capture_output=True):
    """Run a shell command and return the result"""
    try:
        if capture_output:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=True)
            return result.stdout.strip()
        else:
            subprocess.run(cmd, shell=True, check=True)
            return None
    except subprocess.CalledProcessError as e:
        print(f"\033[0;31mError running command: {cmd}\033[0m")
        print(f"Error: {e.stderr}")
        sys.exit(1)

def validate_initiative_id(initiative_id):
    """Validate that the initiative ID follows the expected format"""
    import re
    if not re.match(r'^[A-Z]$', initiative_id):
        print(f"\033[0;31mError: Invalid initiative ID format: {initiative_id}\033[0m")
        print("Expected format: A, B, C, etc.")
        sys.exit(1)

def check_initiative_exists(initiative_id, repo_root):
    """Check if the initiative artifact exists"""
    from glob import glob
    pattern = f"{repo_root}/.kodebase/artifacts/**/{initiative_id}.yml"
    files = glob(pattern, recursive=True)
    
    if not files:
        print(f"\033[0;31mError: Initiative {initiative_id} not found\033[0m")
        print(f"Searched in: {pattern}")
        sys.exit(1)
    
    return files[0]

def get_initiative_context(initiative_id, include_dev_process=False, include_completion_analysis=False):
    """Generate initiative context using the CLI bridge"""
    # Import the CLI bridge functionality
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent
    
    # We'll use Node.js to call the CLI bridge TypeScript code
    # This is a bridge approach until we have a direct Python implementation
    
    # Create a temporary Node.js script to call the CLI bridge
    node_script = f"""
const {{ CLIBridge }} = require('./packages/git-ops/dist/index.js');
const path = require('path');

async function main() {{
    try {{
        const bridge = new CLIBridge();
        const context = await bridge.aggregateInitiativeContext(
            '{initiative_id}',
            '{repo_root}',
            {{
                includeDevelopmentProcess: {str(include_dev_process).lower()},
                includeCompletionAnalysis: {str(include_completion_analysis).lower()}
            }}
        );
        
        console.log(context.content);
    }} catch (error) {{
        console.error('Error:', error.message);
        process.exit(1);
    }}
}}

main();
"""
    
    # Write the temporary script
    temp_script = repo_root / "temp_initiative_context.js"
    with open(temp_script, 'w') as f:
        f.write(node_script)
    
    try:
        # Run the Node.js script
        result = run_command(f"cd {repo_root} && node temp_initiative_context.js")
        return result
    finally:
        # Clean up the temporary script
        if temp_script.exists():
            temp_script.unlink()

def main():
    parser = argparse.ArgumentParser(description='Generate initiative context')
    parser.add_argument('initiative_id', help='Initiative ID (e.g., A)')
    parser.add_argument('--include-dev-process', action='store_true', 
                       help='Include development process information')
    parser.add_argument('--include-completion-analysis', action='store_true',
                       help='Include completion analysis information')
    parser.add_argument('--output', '-o', help='Output file (default: stdout)')
    
    args = parser.parse_args()
    
    # Validate initiative ID format
    validate_initiative_id(args.initiative_id)
    
    # Get repository root
    repo_root = Path(__file__).parent.parent
    
    # Check if initiative exists
    initiative_file = check_initiative_exists(args.initiative_id, repo_root)
    
    print(f"\033[1;33mGenerating context for initiative {args.initiative_id}...\033[0m")
    print(f"\033[0;32m✓ Found initiative file: {initiative_file}\033[0m")
    
    # Generate context
    try:
        context = get_initiative_context(
            args.initiative_id,
            args.include_dev_process,
            args.include_completion_analysis
        )
        
        # Output the context
        if args.output:
            with open(args.output, 'w') as f:
                f.write(context)
            print(f"\033[0;32m✓ Context written to: {args.output}\033[0m")
        else:
            print("\n" + "="*80)
            print(context)
            print("="*80)
            
    except Exception as e:
        print(f"\033[0;31mError generating context: {e}\033[0m")
        sys.exit(1)

if __name__ == "__main__":
    main()