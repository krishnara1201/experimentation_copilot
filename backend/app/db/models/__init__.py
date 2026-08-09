"""Import every model here so any code that imports a single model submodule
(e.g. `from app.db.models.analysis_model import Analysis_Run`) also
transitively registers every other model with SQLAlchemy's mapper registry --
Python always runs a package's __init__.py before its submodules.

This matters because several models reference each other only via string
forward-references in `foreign_key=`/`Relationship(...)` (e.g.
Analysis_Run.experiment_id -> "experiment.id", Experiment.owner -> "User").
SQLAlchemy resolves those lazily, at first use, against whatever tables/
mappers happen to be registered in the process at that point -- so a module
that only imports the one or two models it directly needs can work fine
until it tries to touch a relationship/FK that points at a model nobody in
that process ever imported, and then fails with NoReferencedTableError or
"failed to locate a name" deep inside a flush/query, far from the missing
import.
"""

from app.db.models.user_model import User
from app.db.models.experiment_model import Experiment, Experiment_status
from app.db.models.metric_model import Metric, Metric_type, Metric_direction
from app.db.models.variant_model import Variant
from app.db.models.analysis_model import Analysis_Run, Analysis_Run_Status
from app.db.models.summary_model import Summary

__all__ = [
    "User",
    "Experiment",
    "Experiment_status",
    "Metric",
    "Metric_type",
    "Metric_direction",
    "Variant",
    "Analysis_Run",
    "Analysis_Run_Status",
    "Summary",
]
