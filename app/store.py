# DATA STRUCTURE

import doctest
from intervaltree import Interval, IntervalTree



class QRangeStore:
    """
    A Q-Range KV Store mapping left-inclusive, right-exclusive ranges [low, high) to values.
    Reading from the store returns the collection of values whose ranges contain the query.
    ```
    0  1  2  3  4  5  6  7  8  9
    [A      )[B)            [E)
    [C   )[D   )
           ^       ^        ^  ^
    ```
    >>> store = QRangeStore()
    >>> store[0, 3] = 'Record A'
    >>> store[3, 4] = 'Record B'
    >>> store[0, 2] = 'Record C'
    >>> store[2, 4] = 'Record D'
    >>> store[8, 9] = 'Record E'
    >>> store[2, 0] = 'Record F'
    Traceback (most recent call last):
    IndexError: Invalid Range.
    >>> store[2.1]
    ['Record A', 'Record D']
    >>> store[8]
    ['Record E']
    >>> store[5]
    Traceback (most recent call last):
    IndexError: Not found.
    >>> store[9]
    Traceback (most recent call last):
    IndexError: Not found.
    """

    def __init__(self):
        self._tree = IntervalTree()


    def __setitem__(self, rng, value):
        try:
            (low, high) = rng
        except (TypeError, ValueError):
            raise IndexError("Invalid Range: must provide a low and high value.")
        if not low < high:
            raise IndexError("Invalid Range.")
        self._tree[low:high] = value

    def __getitem__(self, key):
        intervals = self._tree[key]
        if not intervals:
            raise IndexError("Not found.")
        return [iv.data for iv in intervals]
    @property
    def store(self):
        """Return the intervals as a list of (low, high, value) tuples."""
        return [(iv.begin, iv.end, iv.data) for iv in sorted(self._tree)]


doctest.testmod()
