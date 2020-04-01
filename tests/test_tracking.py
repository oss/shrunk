def test_get_new_tracking_id(db):
    ids = [db.get_new_tracking_id() for _ in range(16)]
    assert len(ids) == len(set(ids))
