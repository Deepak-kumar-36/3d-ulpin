import argparse
import sys
import os
sys.path.insert(0, os.getcwd())
from pathlib import Path
from backend.app.geometry.extrusion import load_vision_json, create_3d_model, export_model

def main():
    parser = argparse.ArgumentParser(description="3D-ULPIN Backend CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # extrude command
    extrude_parser = subparsers.add_parser("extrude", help="Extrude a 2D JSON floor plan into a 3D model")
    extrude_parser.add_argument("input_json", type=str, help="Path to the input JSON file (e.g., out/L1.json)")
    extrude_parser.add_argument("--out", type=str, required=True, help="Path to save the output file (e.g., out/L1.glb)")
    extrude_parser.add_argument("--height", type=float, default=100.0, help="Wall height in units (default: 100.0)")
    
    args = parser.parse_args()
    
    if args.command == "extrude":
        in_path = Path(args.input_json)
        out_path = Path(args.out)
        
        if not in_path.exists():
            print(f"Error: Input file {in_path} does not exist.")
            return
            
        print(f"Loading {in_path}...")
        json_data = load_vision_json(in_path)
        
        print(f"Creating 3D model (Wall Height: {args.height})...")
        scene = create_3d_model(json_data, wall_height=args.height)
        
        print(f"Exporting to {out_path}...")
        export_model(scene, out_path)
        print("Done!")

if __name__ == "__main__":
    main()
