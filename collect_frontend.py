import os
import glob

def collect_frontend_code(output_file="frontend_for_claude.txt"):
    base_dir = "frontend"
    # Extensions to include
    extensions = ["*.ts", "*.tsx", "*.css", "*.html", "*.json", "*.js"]
    
    # Exclude directories
    exclude_dirs = ["node_modules", "dist", ".git", ".oxlintrc.json", "package-lock.json"]

    with open(output_file, "w", encoding="utf-8") as outfile:
        outfile.write("### FRONTEND CODEBASE CONTEXT FOR CLAUDE ###\n\n")
        
        for root, dirs, files in os.walk(base_dir):
            # Skip excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for ext in extensions:
                for file in glob.glob(os.path.join(root, ext)):
                    # Skip package-lock.json as it is too large and irrelevant
                    if "package-lock.json" in file:
                        continue
                        
                    try:
                        with open(file, "r", encoding="utf-8") as infile:
                            content = infile.read()
                            
                        outfile.write(f"==================================================\n")
                        outfile.write(f"FILE: {file.replace(os.sep, '/')}\n")
                        outfile.write(f"==================================================\n")
                        outfile.write(content)
                        outfile.write("\n\n")
                    except Exception as e:
                        outfile.write(f"// Error reading file {file}: {e}\n\n")

if __name__ == "__main__":
    collect_frontend_code()
    print("Frontend codebase collected into frontend_for_claude.txt")
