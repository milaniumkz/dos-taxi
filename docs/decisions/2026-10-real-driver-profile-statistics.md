# Actual driver profile statistics

Replace the profile constants (4.92 rating, 85% activity, 120 trips) with authenticated
GET `/api/v1/executor/statistics`. The driver is resolved from the JWT user ID;
caller-supplied IDs cannot select another executor. The route requires the executor
role and returns Cache-Control: no-store.

A single indexed aggregation over that executor's orders returns all-time metrics:

- completedOrders: orders whose status is completed, across taxi, delivery and
  intercity. It counts orders, not seats/passengers, and is not capped by history
  pagination or limited to the daily bonus period.
- rating: the mean of passenger evaluations (orders.executor_rating, valid 1–5) on
  completed orders, rounded to two decimals. ratedOrders counts those evaluations.
  Unrated orders do not contribute zero or an invented starting five-star score.
- cancelledByDriver: orders with status cancelled_executor.
- activityPercent: 100 × completedOrders / (completedOrders + cancelledByDriver),
  rounded to one decimal. Passenger/system cancellations, failed orders and orders
  still being executed are excluded from this completion metric.

No orders means completedOrders=0, rating=null and activityPercent=null. A driver
with only own cancellations has activityPercent=0. Null scores display as an em
dash, with localized explanations. The activity formula appears in a tooltip and
all-time scope below the indicators. This change does not alter stored dispatch
rating/cancellation fields or financial/bonus accounting.

The profile fetches on opening, every 30 seconds while mounted, and on app resume.
Request failures clear displayed figures and show a localized retry action instead
of demo values or a fabricated zero. The profile avatar uses the actual name's
initials rather than a fixed A. No database migration is needed.

SQL integration tests cover independent executors, access control, unrated/new
accounts, completed orders across services, ignored statuses, live evaluation
changes and more than one history page of old completed orders. Flutter tests
cover actual metrics, automatic refresh, error/retry, missing-data semantics and
ru/kk rendering. Native package builds remain deferred; deploy server and web only.
