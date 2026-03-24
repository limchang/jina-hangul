import shutil
import glob
import os

src_dir = r'C:\Users\Administrator\.gemini\antigravity\brain\ad00b39c-4764-424e-8fa7-71b400c636bb'
dest_dir = r'd:\바탕화면\진아글자공부'

print(f"Copying from {src_dir} to {dest_dir}")

if not os.path.exists(dest_dir):
    print(f"Error: {dest_dir} does not exist!")
else:
    for file_path in glob.glob(os.path.join(src_dir, '*.png')):
        f_name = os.path.basename(file_path)
        print(f"Copying {f_name}...")
        try:
            shutil.copy(file_path, os.path.join(dest_dir, f_name))
        except Exception as e:
            print(f"Failed to copy {f_name}: {e}")

print("Done.")
