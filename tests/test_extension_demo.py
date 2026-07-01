from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_popup_exposes_local_demo_preview():
    html = (ROOT / "extension" / "popup.html").read_text(encoding="utf-8")

    assert 'id="demoBtn"' in html
    assert 'id="archiveBtn"' in html
    assert 'id="saveArchiveBtn"' in html
    assert 'id="archiveSearch"' in html
    assert "Preview Demo" in html
    assert '<script src="demo-data.js"></script>' in html
    assert '<script src="archive.js"></script>' in html
    assert html.index("archive.js") < html.index("popup.js")
    assert html.index("demo-data.js") < html.index("popup.js")


def test_demo_fixture_has_enough_posts_for_clustering():
    demo_js = (ROOT / "extension" / "demo-data.js").read_text(encoding="utf-8")

    assert "window.X_DAILY_DEMO_POSTS" in demo_js
    assert demo_js.count("handle:") >= 6
    assert "clean_text:" in demo_js


def test_popup_wires_archive_helpers():
    popup_js = (ROOT / "extension" / "popup.js").read_text(encoding="utf-8")
    archive_js = (ROOT / "extension" / "archive.js").read_text(encoding="utf-8")

    assert "saveCurrentDigest" in popup_js
    assert "renderArchive" in popup_js
    assert "createLocalPreviewApi" in popup_js
    assert "window.XDailyArchive" in popup_js
    assert "buildDigestArchiveEntry" in archive_js
    assert "module.exports" in archive_js
