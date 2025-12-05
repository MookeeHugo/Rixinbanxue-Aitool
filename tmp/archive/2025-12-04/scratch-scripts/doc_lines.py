# -*- coding: utf-8 -*-
from pathlib import Path
path = Path('docs/rixinmath-coarse-to-fine-interface.md')
lines = path.read_text(encoding='utf-8').splitlines()
needles = {
    'future': '未来形态：Python 直连上传',
    'addendum71': '**Addendum（并发）**',
    'prompt71': '**Prompt Snippet**：When implementing preprocess_for_cv',
    'addendum72': '**Addendum（粗框策略）**',
    'addendum73': '**Addendum（阻塞治理）**',
    'addendum75': '**Addendum（Inclusion Rejection）**'
}
for key, needle in needles.items():
    for idx, line in enumerate(lines, 1):
        if needle in line:
            print(key, idx)
            break
