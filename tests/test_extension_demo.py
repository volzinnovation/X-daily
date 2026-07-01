from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_popup_exposes_local_demo_preview():
    html = (ROOT / "extension" / "popup.html").read_text(encoding="utf-8")

    assert 'id="demoBtn"' in html
    assert "Preview Demo" in html
    assert '<script src="demo-data.js"></script>' in html
    assert html.index("demo-data.js") < html.index("popup.js")


def test_demo_fixture_has_enough_posts_for_clustering():
    demo_js = (ROOT / "extension" / "demo-data.js").read_text(encoding="utf-8")

    assert "window.X_DAILY_DEMO_POSTS" in demo_js
    assert demo_js.count("handle:") >= 6
    assert "clean_text:" in demo_js
