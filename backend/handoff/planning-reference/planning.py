"""Deterministic budget facts and versioned goals; no credit score predictions."""
import json
import sqlite3
from decimal import Decimal, InvalidOperation


def money(value):
    if value is None:
        return None
    try:
        amount = Decimal(str(value))
    except InvalidOperation:
        raise ValueError('Invalid amount')
    if not amount.is_finite() or amount < 0 or amount != amount.quantize(Decimal('0.01')):
        raise ValueError('Amounts must be finite nonnegative dollars with at most two decimal places')
    return int(amount * 100)


def rent_facts(profile):
    keys = ('monthly_rent', 'deposit', 'moving_cost', 'available_savings')
    amounts = {k: money(profile.get(k)) for k in keys}
    missing = [k for k, v in amounts.items() if v is None]
    costs = [amounts[k] for k in keys[:3]]
    upfront = sum(costs) if all(v is not None for v in costs) else None
    gap = max(0, upfront - amounts['available_savings']) if upfront is not None and amounts['available_savings'] is not None else None
    return {'estimated_upfront_cents': upfront, 'savings_gap_cents': gap, 'missing': missing,
            'assumptions': ['One month of rent plus stated deposit and moving cost.',
                'Excludes utilities, fees, other living costs and any income before move-in.'],
            'payment_enabled': False}

class Profiles:
    def __init__(self, path):
        self.db = sqlite3.connect(path)
        self.db.execute('CREATE TABLE IF NOT EXISTS profiles (user TEXT, version INTEGER, data TEXT, PRIMARY KEY(user, version))')

    def read(self, user):
        row = self.db.execute('SELECT version,data FROM profiles WHERE user=? ORDER BY version DESC LIMIT 1', (user,)).fetchone()
        return {'version': row[0], 'data': json.loads(row[1])} if row else {'version': 0, 'data': {}}

    def update(self, user, changes, expected_version):
        # Explicit updates only. Raw chat text is not implicitly trusted as structured memory.
        with self.db:
            self.db.execute('BEGIN IMMEDIATE')
            current = self.read(user)
            if expected_version != current['version']:
                raise ValueError('Profile changed; reload before updating')
            data = dict(current['data'], **changes)
            facts = rent_facts(data)
            version = current['version'] + 1
            self.db.execute('INSERT INTO profiles VALUES (?,?,?)', (user, version, json.dumps(data)))
        return {'version': version, 'data': data, 'rent': facts}
