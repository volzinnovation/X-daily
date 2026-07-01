from src.database.storage import DataStorage as LegacyDataStorage
from src.operations.storage import DataStorage


def test_legacy_database_storage_import_points_to_current_storage():
    assert LegacyDataStorage is DataStorage
