from src.config import Config, load_properties


def test_load_properties_keeps_values_containing_equals(tmp_path):
    props_file = tmp_path / "secrets.properties"
    props_file.write_text(
        """
        # comment
        X_USERNAME=my_handle
        TOKEN=abc=def
        malformed
        """,
        encoding="utf-8",
    )

    assert load_properties(props_file) == {
        "X_USERNAME": "my_handle",
        "TOKEN": "abc=def",
    }


def test_environment_overrides_secrets_file(tmp_path, monkeypatch):
    props_file = tmp_path / "secrets.properties"
    props_file.write_text("X_USERNAME=file_user\n", encoding="utf-8")
    monkeypatch.setenv("X_USERNAME", "env_user")

    config = Config(secrets_path=props_file, warn_on_missing=False)

    assert config.X_USERNAME == "env_user"
