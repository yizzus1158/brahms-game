import os

folder = r"c:\Users\User\DEVELOPER\Jhoannes Brahms-Ludovico Ñáñez, Mathias Hospedales, Santiago Reyes, Josecarlo DeFreitas, Themis Martínez y Jesús Zapata\brahms-game"

for root, dirs, files in os.walk(folder):
    for f in files:
        if f.endswith(('.js', '.html', '.css', '.md')):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            # Check if it looks double-encoded
            if 'Ã' in content:
                try:
                    # Reverse the double encoding
                    fixed_content = content.encode('cp1252').decode('utf-8')
                    with open(path, 'w', encoding='utf-8') as file:
                        file.write(fixed_content)
                    print(f"Fixed double-encoding in {path}")
                except Exception as e:
                    print(f"Failed to fix {path}: {e}")
