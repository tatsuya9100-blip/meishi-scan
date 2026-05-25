import os

files = ['index.html', 'style.css', 'app.js']
base_path = r'c:\Users\tokuy\Desktop\anti9100\business-card-app'
out_path = r'c:\Users\tokuy\Desktop\anti9100\MeishiApp_FullCode.md'

try:
    with open(out_path, 'w', encoding='utf-8') as outfile:
        outfile.write("# 名刺アプリ (MeishiScan) 全コード\n\n")
        for f in files:
            filepath = os.path.join(base_path, f)
            ext = f.split('.')[-1]
            if ext == 'js':
                ext = 'javascript'
            outfile.write(f"## {f}\n")
            outfile.write(f"```{ext}\n")
            with open(filepath, 'r', encoding='utf-8') as infile:
                outfile.write(infile.read())
            outfile.write("\n```\n\n")
    print(f"Successfully created: {out_path}")
except Exception as e:
    print(f"Error: {e}")
