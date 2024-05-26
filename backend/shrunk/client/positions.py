from typing import Dict, List

import pymongo

from shrunk.util.ldap import query_position_info

__all__ = ["PositionClient"]


class PositionClient:
    """This class implements the Shrunk position retrieval functionality."""

    def __init__(self):
        pass

    def get_position_info(self, entity: str) -> Dict[str, List[str]]:
        """Get the position info for a user needed to make role request decisions.

         :param entity: The entity to get the position info for.

         :returns Dict[str, List[str]]: The role request position info for the entity. It is formatted as follows:

         .. code-block:: json

        {
            "uid": List[str],
            "rutgersEduStaffDepartment": List[str],
            "title": List[str],
            "employeeType": List[str],
        }
        """
        return query_position_info(entity)
