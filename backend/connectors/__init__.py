from .world_bank import WorldBankConnector
from .imf import IMFConnector
from .ecb import ECBConnector
from .fred import FREDConnector
from .bis import BISConnector
from .oecd import OECDConnector

CONNECTORS = {
    "WORLD_BANK": WorldBankConnector(),
    "IMF": IMFConnector(),
    "ECB": ECBConnector(),
    "FRED": FREDConnector(),
    "BIS": BISConnector(),
    "OECD": OECDConnector(),
}
