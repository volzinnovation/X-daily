import stat

from src.auth_manager import AuthManager, STATE_FILE_MODE


class FakeContext:
    def storage_state(self, path):
        path.write_text("{}", encoding="utf-8")


def test_save_storage_state_restricts_file_permissions(tmp_path):
    state_path = tmp_path / "state.json"
    manager = AuthManager(auth_file=state_path)
    manager.context = FakeContext()

    manager.save_storage_state()

    mode = stat.S_IMODE(state_path.stat().st_mode)
    assert mode == STATE_FILE_MODE
