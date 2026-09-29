"""Equivalent of `vite build --base=./` for this multi-page site when the npm
registry is unreachable: public/ goes to the dist root, pages and src/ are
copied, and root-absolute URLs in HTML are made relative."""
import pathlib, re, shutil, sys
root = pathlib.Path(sys.argv[1]); dist = root / 'dist'
shutil.rmtree(dist, ignore_errors=True); dist.mkdir()
shutil.copytree(root / 'public', dist, dirs_exist_ok=True)
shutil.copytree(root / 'src', dist / 'src')
for html in root.glob('*.html'):
    t = html.read_text(encoding='utf-8')
    t = re.sub(r'(href|src)="/(?!/)', r'\1="./', t)
    (dist / html.name).write_text(t, encoding='utf-8')
print('dist ready:', sum(1 for _ in dist.rglob('*') if _.is_file()), 'files')
