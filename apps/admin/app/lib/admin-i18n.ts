import {
  AdminActivityAction,
  AdminActivityEntityType,
  DeliveryStatus,
  ExecutorTypeValue,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ServiceType,
  VehicleTypeValue,
  VerificationStatusValue,
} from "./backoffice";

export type AdminLocale = "ru" | "kk";

type SearchParamValue = string | string[] | undefined;

type AsyncSearchParams =
  | Promise<Record<string, SearchParamValue>>
  | Record<string, SearchParamValue>
  | undefined;

export type AdminDictionary = {
  nav: {
    dashboard: string;
    orders: string;
    cities: string;
    tariffs: string;
    reports: string;
    promoCodes: string;
    users: string;
    executors: string;
    balanceTopUps: string;
    payouts: string;
    settings: string;
    notes: string;
    activity: string;
  };
  shell: {
    eyebrow: string;
    title: string;
    description: string;
    activeOrders: string;
    citiesOnline: string;
    source: string;
    runtime: string;
    updatedAt: string;
    backendBase: string;
    open: string;
    language: string;
    languageRu: string;
    languageKk: string;
    liveApi: string;
    partialApi: string;
    demoSnapshot: string;
  };
  dashboard: {
    heroTitle: string;
    heroDescription: string;
    contourLabel: string;
    activeOrdersLabel: string;
    activeOrdersHint: (count: number) => string;
    onlineExecutorsLabel: string;
    onlineExecutorsHint: (count: number) => string;
    revenueLabel: string;
    revenueHint: (count: number) => string;
    refundsLabel: string;
    refundsHint: (count: number) => string;
    dispatchEyebrow: string;
    dispatchTitle: string;
    dispatchDescription: string;
    dispatchAside: (count: number) => string;
    citiesEyebrow: string;
    citiesTitle: string;
    citiesDescription: string;
    citiesAside: (count: number) => string;
    tariffsEyebrow: string;
    tariffsTitle: string;
    tariffsDescription: string;
    reportsEyebrow: string;
    reportsTitle: string;
    reportsDescription: string;
    pendingExecutorsEyebrow: string;
    pendingExecutorsTitle: string;
    pendingExecutorsDescription: string;
    pendingExecutorsAside: (count: number) => string;
  };
  settingsPage: {
    title: string;
    description: string;
    dispatchEyebrow: string;
    dispatchTitle: string;
    dispatchDescription: string;
    maxRadiusKm: string;
    maxRadiusHint: string;
    distanceWeight: string;
    ratingWeight: string;
    activityWeight: string;
    priorityWeight: string;
    maxCandidates: string;
    bonusEyebrow: string;
    bonusTitle: string;
    bonusDescription: string;
    bonusEnabled: string;
    bonusOrdersRequired: string;
    bonusAmount: string;
    bonusHint: string;
  };
  ordersPage: {
    liveOrdersLabel: string;
    liveOrdersHint: (count: number) => string;
    deliveryFlowLabel: string;
    deliveryFlowHint: string;
    completedLabel: string;
    completedHint: string;
    totalFeedLabel: string;
    totalFeedHint: string;
    liveEyebrow: string;
    liveTitle: string;
    liveDescription: string;
    liveAside: (count: number) => string;
    historyEyebrow: string;
    historyTitle: string;
    historyDescription: string;
    historyAside: (count: number) => string;
    emptyActiveOrders: string;
    emptyCompletedOrders: string;
    filtersTitle: string;
    filtersDescription: string;
    assignTitle: string;
    assignDescription: string;
  };
  orderDetailPage: {
    eyebrow: string;
    title: (orderId: string) => string;
    description: string;
    backToOrders: string;
    notFoundTitle: string;
    notFoundDescription: string;
    overviewTitle: string;
    overviewDescription: string;
    actorsTitle: string;
    actorsDescription: string;
    routeTitle: string;
    routeDescription: string;
    deliveryTitle: string;
    deliveryDescription: string;
    paymentsTitle: string;
    paymentsDescription: string;
    timelineTitle: string;
    timelineDescription: string;
    actionsTitle: string;
    actionsDescription: string;
    redispatchHint: string;
    statusUpdateHint: string;
    cancellableHint: string;
    noVerifiedExecutors: string;
    refundableHint: string;
    missingExecutor: string;
    missingDelivery: string;
    missingPayments: string;
    missingTimeline: string;
    routePointLabel: (index: number) => string;
    yes: string;
    no: string;
  };
  citiesPage: {
    totalCitiesLabel: string;
    totalCitiesHint: string;
    activeLabel: string;
    activeHint: string;
    standbyLabel: string;
    standbyHint: string;
    marketsLabel: string;
    marketsHint: string;
    eyebrow: string;
    title: string;
    description: string;
    aside: (count: number) => string;
    filtersTitle: string;
    filtersDescription: string;
    createTitle: string;
    createDescription: string;
  };
  tariffsPage: {
    totalTariffsLabel: string;
    totalTariffsHint: string;
    activeVersionsLabel: string;
    activeVersionsHint: string;
    taxiLabel: string;
    taxiHint: string;
    deliveryLabel: string;
    deliveryHint: string;
    eyebrow: string;
    title: string;
    description: string;
    aside: (count: number) => string;
    filtersTitle: string;
    filtersDescription: string;
    createTitle: string;
    createDescription: string;
  };
  reportsPage: {
    capturedLabel: string;
    capturedHint: string;
    refundedLabel: string;
    refundedHint: string;
    totalOrdersLabel: string;
    totalOrdersHint: string;
    executorsActiveLabel: string;
    executorsActiveHint: (count: number) => string;
    eyebrow: string;
    title: string;
    description: string;
    filtersTitle: string;
    filtersDescription: string;
  };
  promoCodesPage: {
    title: string;
    description: string;
    filtersTitle: string;
    filtersDescription: string;
    createEyebrow: string;
    createTitle: string;
    createDescription: string;
    listEyebrow: string;
    listTitle: string;
    listDescription: string;
  };
  usersPage: {
    totalUsersLabel: string;
    totalUsersHint: string;
    blockedLabel: string;
    blockedHint: string;
    ruLabel: string;
    ruHint: string;
    kkLabel: string;
    kkHint: string;
    eyebrow: string;
    title: string;
    description: string;
    filtersTitle: string;
    filtersDescription: string;
  };
  userDetailPage: {
    eyebrow: string;
    title: (value: string) => string;
    description: string;
    backToUsers: string;
    notFoundTitle: string;
    notFoundDescription: string;
    totalOrdersLabel: string;
    profileTitle: string;
    profileDescription: string;
    summaryTitle: string;
    summaryDescription: string;
    cancelledLabel: string;
    cancelledHint: string;
    taxiLabel: string;
    taxiHint: string;
    deliveryLabel: string;
    deliveryHint: string;
    paymentMixLabel: string;
    lastOrderLabel: string;
    lastRouteLabel: string;
    ordersTitle: string;
    ordersDescription: string;
    emptyOrders: string;
  };
  cityDetailPage: {
    eyebrow: string;
    title: (value: string) => string;
    description: string;
    backToCities: string;
    notFoundTitle: string;
    notFoundDescription: string;
    summaryTitle: string;
    summaryDescription: string;
    editTitle: string;
    editDescription: string;
    tariffsTitle: string;
    tariffsDescription: string;
    ordersTitle: string;
    ordersDescription: string;
    emptyOrders: string;
  };
  executorsPage: {
    totalExecutorsLabel: string;
    totalExecutorsHint: string;
    onlineLabel: string;
    onlineHint: string;
    verifiedLabel: string;
    verifiedHint: string;
    blockedLabel: string;
    blockedHint: string;
    eyebrow: string;
    title: string;
    description: string;
    filtersTitle: string;
    filtersDescription: string;
  };
  balanceTopUpsPage: {
    totalLabel: string;
    totalHint: string;
    pendingLabel: string;
    pendingHint: string;
    invoicedLabel: string;
    invoicedHint: string;
    confirmedLabel: string;
    confirmedHint: string;
    eyebrow: string;
    title: string;
    description: string;
    filtersTitle: string;
    filtersDescription: string;
    listTitle: string;
    listDescription: string;
    activeListTitle: string;
    activeListDescription: string;
    historyTitle: string;
    historyDescription: string;
    empty: string;
    allStatuses: string;
    phoneLabel: string;
    executorLabel: string;
    requestedAtLabel: string;
    updatedAtLabel: string;
    adminCommentLabel: string;
    adminCommentPlaceholder: string;
    creditAmountLabel: string;
    markInvoiced: string;
    confirmAndCredit: string;
    reject: string;
    openExecutor: string;
    status: Record<"pending" | "invoiced" | "confirmed" | "rejected", string>;
  };
  executorDetailPage: {
    eyebrow: string;
    title: (value: string) => string;
    description: string;
    backToExecutors: string;
    notFoundTitle: string;
    notFoundDescription: string;
    totalOrdersLabel: string;
    profileTitle: string;
    profileDescription: string;
    summaryTitle: string;
    summaryDescription: string;
    cancelledLabel: string;
    cancelledHint: string;
    taxiLabel: string;
    taxiHint: string;
    deliveryLabel: string;
    deliveryHint: string;
    paymentMixLabel: string;
    lastOrderLabel: string;
    lastRouteLabel: string;
    ordersTitle: string;
    ordersDescription: string;
    emptyOrders: string;
  };
  tariffDetailPage: {
    eyebrow: string;
    title: (value: string) => string;
    description: string;
    backToTariffs: string;
    notFoundTitle: string;
    notFoundDescription: string;
    summaryTitle: string;
    summaryDescription: string;
    editTitle: string;
    editDescription: string;
    cityTitle: string;
    cityDescription: string;
    ordersTitle: string;
    ordersDescription: string;
    emptyOrders: string;
  };
  promoCodeDetailPage: {
    eyebrow: string;
    title: (value: string) => string;
    description: string;
    backToPromoCodes: string;
    notFoundTitle: string;
    notFoundDescription: string;
    summaryTitle: string;
    summaryDescription: string;
    filtersTitle: string;
    filtersDescription: string;
    fullHistoryLabel: string;
    customRangeLabel: string;
    editTitle: string;
    editDescription: string;
    relatedOrdersLabel: string;
    relatedOrdersHint: string;
    completedOrdersLabel: string;
    completedOrdersHint: string;
    analyticsTitle: string;
    analyticsDescription: string;
    grossValueLabel: string;
    grossValueHint: string;
    discountTotalLabel: string;
    discountTotalHint: string;
    completionRateLabel: string;
    completionRateHint: string;
    lastRedeemedLabel: string;
    lastRedeemedHint: string;
    taxiOrdersLabel: string;
    taxiOrdersHint: string;
    deliveryOrdersLabel: string;
    deliveryOrdersHint: string;
    firstTimeUsageLabel: string;
    firstTimeUsageHint: string;
    repeatUsageLabel: string;
    repeatUsageHint: string;
    uniqueClientsLabel: string;
    uniqueClientsHint: string;
    usageRateLabel: string;
    usageRateHint: string;
    firstOrderConversionLabel: string;
    firstOrderConversionHint: string;
    citySplitTitle: string;
    citySplitDescription: string;
    emptyCitySplit: string;
    paymentMixTitle: string;
    paymentMixDescription: string;
    emptyPaymentMix: string;
    statusBreakdownTitle: string;
    statusBreakdownDescription: string;
    emptyStatusBreakdown: string;
    cityOrdersLabel: string;
    cityGrossLabel: string;
    cityDiscountLabel: string;
    cityCompletedLabel: string;
    cityShareHint: (share: string) => string;
    openScopedOrdersLabel: string;
    ordersTitle: string;
    ordersDescription: string;
    ordersPageHint: (count: number) => string;
    nextPageLabel: string;
    firstPageLabel: string;
    emptyOrders: string;
  };
  notesPage: {
    totalNotesLabel: string;
    totalNotesHint: string;
    orderNotesLabel: string;
    orderNotesHint: string;
    userNotesLabel: string;
    userNotesHint: string;
    executorNotesLabel: string;
    executorNotesHint: string;
    cityNotesLabel: string;
    cityNotesHint: string;
    tariffNotesLabel: string;
    tariffNotesHint: string;
    promoCodeNotesLabel: string;
    promoCodeNotesHint: string;
    eyebrow: string;
    title: string;
    description: string;
    queueTitle: string;
    queueDescription: string;
    queueOpenLabel: string;
    queueOpenHint: string;
    queueHandoffLabel: string;
    queueHandoffHint: string;
    queueEscalationLabel: string;
    queueEscalationHint: string;
    queueUnassignedLabel: string;
    queueUnassignedHint: string;
    queuePinnedLabel: string;
    queuePinnedHint: string;
    queueStaleLabel: string;
    queueStaleHint: string;
    queueCriticalLabel: string;
    queueCriticalHint: string;
    filtersTitle: string;
    filtersDescription: string;
    entityTypeLabel: string;
    entityIdLabel: string;
    authorLabel: string;
    assigneeLabel: string;
    assignmentLabel: string;
    queryLabel: string;
    kindLabel: string;
    pinnedLabel: string;
    stateLabel: string;
    agingLabel: string;
    limitLabel: string;
    allEntities: string;
    allKinds: string;
    allPins: string;
    allNoteStates: string;
    allAging: string;
    allAssignments: string;
    assignedOnly: string;
    unassignedOnly: string;
    pinnedOnly: string;
    unpinnedOnly: string;
    freshOnly: string;
    staleOnly: string;
    criticalOnly: string;
    empty: string;
    openEntity: string;
  };
  activityPanel: {
    eyebrow: string;
    title: string;
    description: string;
    openFeedLabel: string;
    totalLabel: string;
    totalHint: string;
    actorCountLabel: string;
    actorCountHint: string;
    noteOpsLabel: string;
    noteOpsHint: string;
    latestLabel: string;
    latestHint: string;
    empty: string;
  };
  activityPage: {
    totalEventsLabel: string;
    totalEventsHint: string;
    orderOpsLabel: string;
    orderOpsHint: string;
    noteOpsLabel: string;
    noteOpsHint: string;
    paymentOpsLabel: string;
    paymentOpsHint: string;
    moderationOpsLabel: string;
    moderationOpsHint: string;
    eyebrow: string;
    title: string;
    description: string;
    filtersTitle: string;
    filtersDescription: string;
    entityTypeLabel: string;
    entityIdLabel: string;
    actorLabel: string;
    queryLabel: string;
    actionLabel: string;
    groupLabel: string;
    windowLabel: string;
    limitLabel: string;
    allEntities: string;
    allActions: string;
    allGroups: string;
    allWindows: string;
    groupOrderLabel: string;
    groupOrderHint: string;
    groupPaymentLabel: string;
    groupPaymentHint: string;
    groupNoteLabel: string;
    groupNoteHint: string;
    groupModerationLabel: string;
    groupModerationHint: string;
    windowHourLabel: string;
    windowHourHint: string;
    windowDayLabel: string;
    windowDayHint: string;
    windowWeekLabel: string;
    windowWeekHint: string;
    empty: string;
    openEntity: string;
    openActorLabel: string;
    openActionLabel: string;
    systemActorLabel: string;
  };
  table: {
    id: string;
    service: string;
    route: string;
    status: string;
    payment: string;
    amount: string;
    createdAt: string;
    routePending: string;
    emptyOrders: string;
  };
  citiesPanel: {
    empty: string;
    live: string;
    standby: string;
    currency: string;
    timezone: string;
    country: string;
  };
  tariffsPanel: {
    empty: string;
    active: string;
    archived: string;
    base: string;
    perKm: string;
    perMinute: string;
    minimum: string;
  };
  reportsPanel: {
    paymentFlow: string;
    captured: string;
    refunded: string;
    paymentsCount: string;
    completedOrders: string;
    serviceMix: string;
    statusHeat: string;
  };
  usersPanel: {
    empty: string;
  };
  executorsPanel: {
    empty: string;
  };
  notesPanel: {
    eyebrow: string;
    title: string;
    description: string;
    createTitle: string;
    createDescription: string;
    openFeedLabel: string;
    openQueueLabel: string;
    openEscalationsLabel: string;
    openActivityLabel: string;
    kindLabel: string;
    pinnedLabel: string;
    stateLabel: string;
    assigneeLabel: string;
    assigneePlaceholder: string;
    pinnedOn: string;
    pinnedOff: string;
    pinnedBadge: string;
    unassignedLabel: string;
    resolvedAtLabel: string;
    archivedAtLabel: string;
    updatedAtLabel: string;
    bodyPlaceholder: string;
    empty: string;
    authorFallback: string;
  };
  forms: {
    apply: string;
    clear: string;
    create: string;
    save: string;
    addNote: string;
    activate: string;
    deactivate: string;
    archive: string;
    assign: string;
    retry: string;
    cancel: string;
    refund: string;
    block: string;
    unblock: string;
    orderId: string;
    executorId: string;
    userId: string;
    payment: string;
    amount: string;
    address: string;
    refundAmount: string;
    reason: string;
    search: string;
    period: string;
    dateFrom: string;
    dateTo: string;
    status: string;
    blockedState: string;
    onlineState: string;
    verificationStatus: string;
    city: string;
    limit: string;
    serviceType: string;
    activeState: string;
    allStates: string;
    activeOnly: string;
    inactiveOnly: string;
    blockedOnly: string;
    unblockedOnly: string;
    onlineOnly: string;
    offlineOnly: string;
    activeBadge: string;
    inactiveBadge: string;
    onlineBadge: string;
    offlineBadge: string;
    blockedBadge: string;
    unblockedBadge: string;
    nameRu: string;
    nameKk: string;
    name: string;
    phone: string;
    language: string;
    countryCode: string;
    currency: string;
    bonusBalance: string;
    timezone: string;
    isActive: string;
    executorType: string;
    vehicleType: string;
    vehicleClass: string;
    assignedCarClass: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleYear: string;
    vehiclePlate: string;
    carClassEconomy: string;
    carClassComfort: string;
    carClassComfortPlus: string;
    carClassBusiness: string;
    rating: string;
    cancelRate: string;
    balance: string;
    client: string;
    executor: string;
    pickup: string;
    destination: string;
    distance: string;
    duration: string;
    discountAmount: string;
    acceptedAt: string;
    startedAt: string;
    completedAt: string;
    cancelledAt: string;
    cancelReason: string;
    updatedAt: string;
    clientRating: string;
    executorRating: string;
    contact: string;
    notes: string;
    arrivedAt: string;
    paymentStatus: string;
    provider: string;
    providerTransactionId: string;
    refundedAmount: string;
    capturedAt: string;
    packageDescription: string;
    declaredValue: string;
    fragile: string;
    requiresReturn: string;
    cashOnDelivery: string;
    proofPhoto: string;
    proofSignature: string;
    recipientCode: string;
    packagePhoto: string;
    metadata: string;
    actorId: string;
    noteId: string;
    source: string;
    previousTariffId: string;
    createdAt: string;
    basePrice: string;
    pricePerKm: string;
    pricePerMinute: string;
    minimumPrice: string;
    freeWaitingSeconds: string;
    paidWaitingPerMinute: string;
    commissionPercent: string;
    commissionFixed: string;
    validFrom: string;
    validTo: string;
    code: string;
    discountType: string;
    discountValue: string;
    maxUses: string;
    percent: string;
    fixed: string;
    noLimit: string;
  };
  periods: {
    day: string;
    week: string;
    month: string;
  };
  warnings: {
    adminApiTokenMissing: string;
    adminApiUrlInvalid: string;
    failedToLoad: (scope: string, detail: string) => string;
    scopeCities: string;
    scopeTariffs: string;
    scopeOrders: string;
    scopeFinancialReport: string;
    scopeOperationsReport: string;
  };
  feedback: {
    cityCreated: string;
    cityUpdated: string;
    tariffCreated: string;
    tariffUpdated: string;
    promoCreated: string;
    promoUpdated: string;
    orderAssigned: string;
    dispatchRestarted: string;
    orderStatusUpdated: string;
    paymentCancelled: string;
    paymentRefunded: string;
    userUpdated: string;
    executorVerified: string;
    executorBlocked: string;
    executorBalanceTopUpUpdated: string;
    executorPayoutCreated: string;
    executorPayoutUpdated: string;
    dispatchSettingsUpdated: string;
    driverBonusSettingsUpdated: string;
    noteCreated: string;
    noteUpdated: string;
    actionFailed: (detail: string) => string;
  };
  enums: {
    serviceType: Record<ServiceType, string>;
    orderStatus: Record<OrderStatus, string>;
    deliveryStatus: Record<DeliveryStatus, string>;
    paymentMethod: Record<PaymentMethod, string>;
    paymentStatus: Record<PaymentStatus, string>;
    executorType: Record<ExecutorTypeValue, string>;
    vehicleType: Record<VehicleTypeValue, string>;
    verificationStatus: Record<VerificationStatusValue, string>;
    adminNoteKind: Record<"context" | "handoff" | "escalation", string>;
    adminNoteState: Record<"open" | "resolved" | "archived", string>;
    adminActivityEntityType: Record<AdminActivityEntityType, string>;
    adminActivityAction: Record<AdminActivityAction, string>;
  };
};

const dictionaries: Record<AdminLocale, AdminDictionary> = {
  ru: {
    nav: {
      dashboard: "Обзор",
      orders: "Заказы",
      cities: "Города",
      tariffs: "Тарифы",
      reports: "Отчёты",
      promoCodes: "Промокоды",
      users: "Клиенты",
      executors: "Исполнители",
      balanceTopUps: "Пополнения",
      payouts: "Выплаты",
      settings: "Настройки",
      notes: "Заметки",
      activity: "Активность",
    },
    shell: {
      eyebrow: "DOS Backoffice",
      title: "Операционный штаб",
      description:
        "Операционный слой для диспетчеризации, тарифов, городов и живых заказов.",
      activeOrders: "Активные заказы",
      citiesOnline: "Города online",
      source: "Источник",
      runtime: "Режим",
      updatedAt: "Обновлено",
      backendBase: "Адрес backend",
      open: "Открыт",
      language: "Язык",
      languageRu: "Рус",
      languageKk: "Қаз",
      liveApi: "Живой API",
      partialApi: "Частичный API",
      demoSnapshot: "Демо-слепок",
    },
    dashboard: {
      heroTitle: "Операционный контур города, тарифов и живых заказов",
      heroDescription:
        "Панель собрана вокруг текущих API-модулей: диспетчеризация, тарифы, активные поездки, доставка и финансы. Если backend недоступен, экран переключается на demo snapshot без потери структуры.",
      contourLabel: "Контур: dispatch, pricing, orders, reports",
      activeOrdersLabel: "Активные заказы",
      activeOrdersHint: (count) => `${count} ждут назначения`,
      onlineExecutorsLabel: "Онлайн исполнители",
      onlineExecutorsHint: (count) => `${count} проверены`,
      revenueLabel: "Выручка дня",
      revenueHint: (count) => `${count} платежей`,
      refundsLabel: "Возвраты",
      refundsHint: (count) => `${count} завершённых заказов`,
      dispatchEyebrow: "Пульс диспетча",
      dispatchTitle: "Живой поток заказов",
      dispatchDescription:
        "Срез по заказам, которые сейчас критичны для оператора.",
      dispatchAside: (count) => `${count} delivery`,
      citiesEyebrow: "Города",
      citiesTitle: "Города и зоны",
      citiesDescription: "Какие города сейчас открыты для приёма заказов.",
      citiesAside: (count) => `${count} active`,
      tariffsEyebrow: "Тарифы",
      tariffsTitle: "Активные тарифные версии",
      tariffsDescription:
        "Новые заказы должны считаться по этим конфигурациям.",
      reportsEyebrow: "Финансы",
      reportsTitle: "Дневная экономика",
      reportsDescription:
        "Срез по списаниям, возвратам и операционной нагрузке.",
      pendingExecutorsEyebrow: "Быстрая проверка",
      pendingExecutorsTitle: "Водители на одобрении",
      pendingExecutorsDescription:
        "Назначьте класс автомобиля и сразу обновите статус проверки.",
      pendingExecutorsAside: (count) => `${count} ожидают решения`,
    },
    settingsPage: {
      title: "Настройки системы",
      description:
        "Операционные параметры, которые backend применяет без пересборки приложений.",
      dispatchEyebrow: "Диспетчеризация",
      dispatchTitle: "Радиус и ранжирование исполнителей",
      dispatchDescription:
        "Заказ предлагается только исполнителям внутри радиуса. Итоговый рейтинг считается по расстоянию, рейтингу, свежести геопозиции и приоритету.",
      maxRadiusKm: "Радиус назначения, км",
      maxRadiusHint: "По умолчанию 3 км.",
      distanceWeight: "Вес расстояния",
      ratingWeight: "Вес рейтинга",
      activityWeight: "Вес активности",
      priorityWeight: "Вес приоритета",
      maxCandidates: "Кандидатов в очереди",
      bonusEyebrow: "Бонусы водителям",
      bonusTitle: "Бонус за выполненные заказы",
      bonusDescription:
        "Backend начисляет бонус на баланс водителя после заданного числа завершённых заказов. Приложение обновлять не нужно.",
      bonusEnabled: "Включить бонус",
      bonusOrdersRequired: "Сколько заказов выполнить",
      bonusAmount: "Сумма бонуса, ₸",
      bonusHint:
        "Сейчас: 20 заказов = 5 000 ₸. Начисление повторяется на 20, 40, 60 заказах.",
    },
    ordersPage: {
      liveOrdersLabel: "Живые заказы",
      liveOrdersHint: (count) => `${count} в поиске`,
      deliveryFlowLabel: "Delivery поток",
      deliveryFlowHint: "включая активные и завершённые",
      completedLabel: "Завершено",
      completedHint: "в текущем snapshot",
      totalFeedLabel: "Всего в ленте",
      totalFeedHint: "последние события города",
      liveEyebrow: "Операции",
      liveTitle: "Критичные заказы",
      liveDescription:
        "Здесь собраны заказы, которым сейчас нужен контроль оператора.",
      liveAside: (count) => `${count} live`,
      historyEyebrow: "История",
      historyTitle: "Недавние завершения",
      historyDescription:
        "Быстрый аудит последних выполненных поездок и доставок.",
      historyAside: (count) => `${count} done`,
      emptyActiveOrders: "Активных заказов сейчас нет.",
      emptyCompletedOrders: "Завершённых заказов пока нет.",
      filtersTitle: "Фильтры заказов",
      filtersDescription:
        "Быстрый отбор по статусу, городу и размеру выдачи без перезагрузки структуры страницы.",
      assignTitle: "Ручное назначение",
      assignDescription:
        "Используйте этот блок, чтобы вручную назначить исполнителя на заказ в статусе поиска.",
    },
    orderDetailPage: {
      eyebrow: "Карточка заказа",
      title: (orderId) => `Заказ ${orderId}`,
      description:
        "Полный контекст по заказу: клиент, исполнитель, маршрут, оплата и таймлайн переходов.",
      backToOrders: "Назад к списку",
      notFoundTitle: "Заказ не найден",
      notFoundDescription:
        "По этому идентификатору нет доступных данных ни в live API, ни в demo snapshot.",
      overviewTitle: "Сводка заказа",
      overviewDescription:
        "Базовые атрибуты заказа и ключевые временные точки жизненного цикла.",
      actorsTitle: "Участники заказа",
      actorsDescription:
        "Клиент и исполнитель, связанные с текущим состоянием заказа.",
      routeTitle: "Маршрут и точки",
      routeDescription:
        "Адреса, контакты и отметки прибытия по каждой точке маршрута.",
      deliveryTitle: "Детали доставки",
      deliveryDescription:
        "Параметры посылки, COD и подтверждение вручения для delivery-заказов.",
      paymentsTitle: "Платежи",
      paymentsDescription:
        "Платёжные попытки, статусы списания и данные провайдера.",
      timelineTitle: "Таймлайн статусов",
      timelineDescription:
        "Все переходы статусов, которые backend зафиксировал по заказу.",
      actionsTitle: "Операторские действия",
      actionsDescription:
        "Повторный запуск диспетча, назначение исполнителя, ручное завершение инцидента и действия по платежам.",
      redispatchHint:
        "Повторно запускает подбор исполнителей для заказа в поиске и закрывает предыдущие незавершённые офферы.",
      statusUpdateHint:
        "Для зависших заказов оператор может перевести заказ только в system cancel или failed.",
      cancellableHint:
        "Отмена доступна только для платежей в статусе холда, когда списание ещё не произошло.",
      noVerifiedExecutors:
        "Нет доступных проверенных исполнителей для этого города.",
      refundableHint:
        "Возврат доступен только для списанных или частично возвращённых платежей.",
      missingExecutor: "Исполнитель ещё не назначен.",
      missingDelivery: "Для этого заказа нет блока delivery details.",
      missingPayments: "Платежные записи пока отсутствуют.",
      missingTimeline: "Таймлайн переходов пока пуст.",
      routePointLabel: (index) => `Точка ${index + 1}`,
      yes: "Да",
      no: "Нет",
    },
    citiesPage: {
      totalCitiesLabel: "Города в системе",
      totalCitiesHint: "сейчас доступны в snapshot",
      activeLabel: "Активные",
      activeHint: "принимают заказы",
      standbyLabel: "Резерв",
      standbyHint: "не открыты для клиентов",
      marketsLabel: "Рынки KZ",
      marketsHint: "городов в Казахстане",
      eyebrow: "Покрытие",
      title: "Города и зоны обслуживания",
      description:
        "Контроль списка городов, валюты и статуса выхода в production.",
      aside: (count) => `${count} open now`,
      filtersTitle: "Фильтры городов",
      filtersDescription:
        "Быстрый поиск по ID, названию, валюте, коду страны и timezone.",
      createTitle: "Добавить город",
      createDescription:
        "Создайте новый рынок и сразу определите его базовую валюту и статус запуска.",
    },
    tariffsPage: {
      totalTariffsLabel: "Всего тарифов",
      totalTariffsHint: "доступно в snapshot",
      activeVersionsLabel: "Активные версии",
      activeVersionsHint: "используются в расчётах",
      taxiLabel: "Такси",
      taxiHint: "по классам такси",
      deliveryLabel: "Доставка",
      deliveryHint: "по типам курьеров",
      eyebrow: "Тарификация",
      title: "Тарифные конфигурации",
      description:
        "Слои ценообразования, которые backend использует в estimate и create order.",
      aside: (count) => `${count} active`,
      filtersTitle: "Фильтры тарифов",
      filtersDescription:
        "Отберите нужный город, сервис и состояние тарифа перед обновлением.",
      createTitle: "Создать тариф",
      createDescription:
        "Новая тарифная запись сразу будет доступна для расчёта стоимости.",
    },
    reportsPage: {
      capturedLabel: "Списано KZT",
      capturedHint: "сумма списаний за период",
      refundedLabel: "Возвращено KZT",
      refundedHint: "возвраты и корректировки",
      totalOrdersLabel: "Всего заказов",
      totalOrdersHint: "операционная нагрузка",
      executorsActiveLabel: "Активные исполнители",
      executorsActiveHint: (count) => `${count} проверены`,
      eyebrow: "Отчёты",
      title: "Финансовый и операционный срез",
      description:
        "Блок для ежедневной сверки платёжного потока, структуры сервисов и статусов.",
      filtersTitle: "Фильтры отчётов",
      filtersDescription:
        "Сверяйте аналитику по периоду и городу без переключения на другие экраны.",
    },
    promoCodesPage: {
      title: "Промокоды",
      description:
        "Управление скидками и маркетинговыми предложениями для клиентов.",
      filtersTitle: "Фильтры промокодов",
      filtersDescription:
        "Ищите промокоды по ID, коду, типу скидки или значению без перехода в другие разделы.",
      createEyebrow: "Создание",
      createTitle: "Новый промокод",
      createDescription:
        "Создайте фиксированную скидку или процентную акцию для MVP-этапа.",
      listEyebrow: "Каталог",
      listTitle: "Текущие промокоды",
      listDescription:
        "Активация и контроль жизненного цикла действующих скидок.",
    },
    usersPage: {
      totalUsersLabel: "Клиенты в ленте",
      totalUsersHint: "профили из текущей ленты заказов",
      blockedLabel: "Заблокированы",
      blockedHint: "требуют внимания поддержки",
      ruLabel: "RU профили",
      ruHint: "русский язык по умолчанию",
      kkLabel: "KK профили",
      kkHint: "казахский язык по умолчанию",
      eyebrow: "Клиенты",
      title: "Профили клиентов",
      description:
        "Рабочий реестр клиентов, которые уже участвуют в текущем потоке заказов.",
      filtersTitle: "Фильтры клиентов",
      filtersDescription: "Быстрый отбор по блокировке и языку интерфейса.",
    },
    userDetailPage: {
      eyebrow: "Карточка клиента",
      title: (value) => `Клиент ${value}`,
      description:
        "Профиль клиента, быстрые действия и связанные заказы из текущего операционного среза.",
      backToUsers: "Назад к клиентам",
      notFoundTitle: "Клиент не найден",
      notFoundDescription:
        "По этому идентификатору нет доступных данных ни в live API, ни в demo snapshot.",
      totalOrdersLabel: "Всего заказов",
      profileTitle: "Профиль клиента",
      profileDescription:
        "Контакты, язык, валюта и блокировка с быстрым редактированием.",
      summaryTitle: "Операционная сводка",
      summaryDescription:
        "Структура статусов, сервисов и способов оплаты по связанным заказам клиента.",
      cancelledLabel: "Отмены и сбои",
      cancelledHint: "cancelled_* и failed",
      taxiLabel: "Такси",
      taxiHint: "по связанным заказам",
      deliveryLabel: "Доставка",
      deliveryHint: "по связанным заказам",
      paymentMixLabel: "Способы оплаты",
      lastOrderLabel: "Последний заказ",
      lastRouteLabel: "Последний маршрут",
      ordersTitle: "Связанные заказы",
      ordersDescription:
        "Последние заказы этого клиента из текущего backoffice feed.",
      emptyOrders:
        "Для этого клиента в текущем срезе заказов ничего не найдено.",
    },
    cityDetailPage: {
      eyebrow: "Карточка города",
      title: (value) => `Город ${value}`,
      description:
        "Контекст по городу: валюта, timezone, связанные тарифы и поток заказов.",
      backToCities: "Назад к городам",
      notFoundTitle: "Город не найден",
      notFoundDescription:
        "По этому идентификатору нет доступных данных ни в live API, ни в demo snapshot.",
      summaryTitle: "Сводка города",
      summaryDescription:
        "Базовые атрибуты города и операционная нагрузка текущего среза.",
      editTitle: "Редактирование города",
      editDescription:
        "Обновляйте названия, страну, валюту, timezone и состояние активности из одной карточки.",
      tariffsTitle: "Тарифы города",
      tariffsDescription:
        "Все тарифные записи, которые сейчас связаны с этим городом.",
      ordersTitle: "Заказы города",
      ordersDescription:
        "Последние заказы, созданные в этом городе, для быстрого операционного аудита.",
      emptyOrders: "По этому городу пока нет заказов в текущем snapshot.",
    },
    executorsPage: {
      totalExecutorsLabel: "Исполнители в ленте",
      totalExecutorsHint: "водители и курьеры из текущей ленты заказов",
      onlineLabel: "Сейчас онлайн",
      onlineHint: "готовы к приёму заказов",
      verifiedLabel: "Проверены",
      verifiedHint: "прошли верификацию",
      blockedLabel: "Заблокированы",
      blockedHint: "не должны получать предложения",
      eyebrow: "Исполнители",
      title: "Реестр водителей и курьеров",
      description:
        "Операционный срез исполнителей с верификацией и блокировкой прямо из backoffice.",
      filtersTitle: "Фильтры исполнителей",
      filtersDescription:
        "Отбор по статусу проверки, онлайн-состоянию и городу.",
    },
    balanceTopUpsPage: {
      totalLabel: "Всего заявок",
      totalHint: "по выбранному фильтру",
      pendingLabel: "Новые",
      pendingHint: "нужно выставить счёт",
      invoicedLabel: "Счёт выставлен",
      invoicedHint: "ожидают оплаты",
      confirmedLabel: "Зачислено",
      confirmedHint: "баланс уже пополнен",
      eyebrow: "Баланс",
      title: "Заявки на пополнение водителей",
      description:
        "Водитель оставляет сумму и телефон. Администратор выставляет счёт Kaspi, затем подтверждает оплату и зачисляет баланс.",
      filtersTitle: "Фильтр заявок",
      filtersDescription:
        "Отберите новые, выставленные, подтверждённые или отклонённые заявки.",
      listTitle: "Очередь пополнений",
      listDescription:
        "Здесь отображаются все заявки водителей на пополнение личного счёта.",
      activeListTitle: "Активные заявки",
      activeListDescription:
        "Здесь только новые заявки и выставленные счета. После зачисления карточка уйдёт в историю.",
      historyTitle: "История пополнений",
      historyDescription:
        "Подтверждённые и отклонённые заявки без повторных действий.",
      empty: "Заявок по этому фильтру нет.",
      allStatuses: "Все статусы",
      phoneLabel: "Телефон для счёта",
      executorLabel: "Исполнитель",
      requestedAtLabel: "Создано",
      updatedAtLabel: "Обновлено",
      adminCommentLabel: "Комментарий",
      adminCommentPlaceholder: "Например: счёт Kaspi выставлен",
      creditAmountLabel: "Сумма к зачислению",
      markInvoiced: "Счёт Kaspi выставлен",
      confirmAndCredit: "Подтвердить и зачислить",
      reject: "Отклонить",
      openExecutor: "Открыть водителя",
      status: {
        pending: "Новая",
        invoiced: "Счёт выставлен",
        confirmed: "Зачислено",
        rejected: "Отклонена",
      },
    },
    executorDetailPage: {
      eyebrow: "Карточка исполнителя",
      title: (value) => `Исполнитель ${value}`,
      description:
        "Профиль исполнителя, статусы проверки и связанные заказы из текущего операционного среза.",
      backToExecutors: "Назад к исполнителям",
      notFoundTitle: "Исполнитель не найден",
      notFoundDescription:
        "По этому идентификатору нет доступных данных ни в live API, ни в demo snapshot.",
      totalOrdersLabel: "Всего заказов",
      profileTitle: "Профиль исполнителя",
      profileDescription:
        "Верификация, онлайн-статус и блокировка с быстрыми операторскими действиями.",
      summaryTitle: "Операционная сводка",
      summaryDescription:
        "Срез по статусам, сервисам и способам оплаты в связанных заказах исполнителя.",
      cancelledLabel: "Отмены и сбои",
      cancelledHint: "cancelled_* и failed",
      taxiLabel: "Такси",
      taxiHint: "по связанным заказам",
      deliveryLabel: "Доставка",
      deliveryHint: "по связанным заказам",
      paymentMixLabel: "Способы оплаты",
      lastOrderLabel: "Последний заказ",
      lastRouteLabel: "Последний маршрут",
      ordersTitle: "Связанные заказы",
      ordersDescription:
        "Последние заказы этого исполнителя из текущего backoffice feed.",
      emptyOrders:
        "Для этого исполнителя в текущем срезе заказов ничего не найдено.",
    },
    tariffDetailPage: {
      eyebrow: "Карточка тарифа",
      title: (value) => `Тариф ${value}`,
      description:
        "Конфигурация тарифа, связанный город и заказы, которые потенциально считаются по этому слою.",
      backToTariffs: "Назад к тарифам",
      notFoundTitle: "Тариф не найден",
      notFoundDescription:
        "По этому идентификатору нет доступных данных ни в live API, ни в demo snapshot.",
      summaryTitle: "Сводка тарифа",
      summaryDescription: "Ключевые параметры тарифа, валюта и окно действия.",
      editTitle: "Обновление тарифа",
      editDescription:
        "Изменение коммерческих параметров создаёт новую тарифную версию, а срок действия и активность обновляются на текущей записи.",
      cityTitle: "Связанный город",
      cityDescription:
        "Город, для которого действует эта тарифная конфигурация.",
      ordersTitle: "Поток заказов",
      ordersDescription:
        "Последние заказы того же сервиса в городе, чтобы быстро оценить влияние тарифа.",
      emptyOrders: "Связанных заказов для этого тарифа в snapshot пока нет.",
    },
    promoCodeDetailPage: {
      eyebrow: "Карточка промокода",
      title: (value) => `Промокод ${value}`,
      description:
        "Контекст по промокоду, его состоянию и истории операторских действий.",
      backToPromoCodes: "Назад к промокодам",
      notFoundTitle: "Промокод не найден",
      notFoundDescription:
        "По этому идентификатору нет доступных данных ни в live API, ни в demo snapshot.",
      summaryTitle: "Сводка промокода",
      summaryDescription:
        "Тип скидки, лимиты, срок действия и текущее состояние промокода.",
      filtersTitle: "Фильтры аналитики",
      filtersDescription:
        "Сужайте историю промокода по периоду, точному диапазону дат и городу, чтобы синхронно обновлять KPI и список заказов.",
      fullHistoryLabel: "Вся история",
      customRangeLabel: "Точный диапазон",
      editTitle: "Редактирование промокода",
      editDescription:
        "Меняйте код, тип скидки, лимиты и активность без перехода в общий список.",
      relatedOrdersLabel: "Связанные заказы",
      relatedOrdersHint: "в доступном аналитическом контуре",
      completedOrdersLabel: "Завершённые",
      completedOrdersHint: "по истории использования этого промокода",
      analyticsTitle: "Эффект промокода",
      analyticsDescription:
        "Сводка по использованию промокода: валовый объём, выданная скидка, completion rate и mix сервисов. При live API строится по полной истории, иначе по fallback snapshot.",
      grossValueLabel: "Валовый объём",
      grossValueHint: "сумма final или estimated по связанным заказам",
      discountTotalLabel: "Выдано скидок",
      discountTotalHint: "совокупный discountAmount по заказам с промокодом",
      completionRateLabel: "Completion rate",
      completionRateHint: "завершённые от всех связанных заказов",
      lastRedeemedLabel: "Последнее использование",
      lastRedeemedHint: "по времени создания последнего заказа с промокодом",
      taxiOrdersLabel: "Такси",
      taxiOrdersHint: "сколько taxi-заказов прошло с этим промокодом",
      deliveryOrdersLabel: "Доставка",
      deliveryOrdersHint: "сколько delivery-заказов прошло с этим промокодом",
      firstTimeUsageLabel: "Первое использование",
      firstTimeUsageHint:
        "редемпшены, где промокод пришёлся на первый заказ клиента в доступном контуре данных",
      repeatUsageLabel: "Повторное использование",
      repeatUsageHint:
        "редемпшены клиентов, у которых уже был более ранний заказ в доступном контуре данных",
      uniqueClientsLabel: "Уникальные клиенты",
      uniqueClientsHint:
        "сколько разных клиентов использовали промокод в доступном контуре данных",
      usageRateLabel: "Использование лимита",
      usageRateHint:
        "отношение текущих редемпшенов к maxUses; для безлимитных промокодов лимит не применяется",
      firstOrderConversionLabel: "First-order conversion",
      firstOrderConversionHint:
        "доля уникальных клиентов, у которых промокод использован на первом заказе в доступном аналитическом контуре",
      citySplitTitle: "Города использования",
      citySplitDescription:
        "Разрез по городам с количеством заказов, валовым объёмом, скидкой и completed flow.",
      emptyCitySplit:
        "Городской разрез для этого промокода в доступном аналитическом контуре пока пуст.",
      paymentMixTitle: "Структура оплат",
      paymentMixDescription:
        "Разрез использования промокода по способам оплаты в текущем аналитическом скоупе.",
      emptyPaymentMix:
        "По выбранному скоупу для этого промокода пока нет данных по способам оплаты.",
      statusBreakdownTitle: "Структура статусов",
      statusBreakdownDescription:
        "Разрез заказов с этим промокодом по итоговым статусам в текущем аналитическом скоупе.",
      emptyStatusBreakdown:
        "По выбранному скоупу для этого промокода пока нет данных по статусам.",
      cityOrdersLabel: "Заказы",
      cityGrossLabel: "Валовый объём",
      cityDiscountLabel: "Скидка",
      cityCompletedLabel: "Завершено",
      cityShareHint: (share) => `${share} от всех заказов с этим промокодом`,
      openScopedOrdersLabel: "Открыть заказы",
      ordersTitle: "Заказы с промокодом",
      ordersDescription:
        "Последние заказы, в которых использован этот промокод, из исторического admin feed или fallback snapshot.",
      ordersPageHint: (count) => `в текущем окне ${count} заказов`,
      nextPageLabel: "Следующая страница",
      firstPageLabel: "К первой странице",
      emptyOrders:
        "По этому промокоду в доступном заказном контуре ничего не найдено.",
    },
    notesPage: {
      totalNotesLabel: "Всего заметок",
      totalNotesHint: "в текущей выборке",
      orderNotesLabel: "По заказам",
      orderNotesHint: "операционные кейсы заказов",
      userNotesLabel: "По клиентам",
      userNotesHint: "контекст по клиентским профилям",
      executorNotesLabel: "По исполнителям",
      executorNotesHint: "контекст по водителям и курьерам",
      cityNotesLabel: "По городам",
      cityNotesHint: "контекст по сервисным контурам",
      tariffNotesLabel: "По тарифам",
      tariffNotesHint: "изменения тарифной политики",
      promoCodeNotesLabel: "По промокодам",
      promoCodeNotesHint: "маркетинговые и support-кейсы",
      eyebrow: "Внутренние заметки",
      title: "Лента операторских заметок",
      description:
        "Единый реестр внутренних заметок с фильтрами по объекту, типу заметки, pin-маркеру, автору и содержимому.",
      queueTitle: "Операторские очереди",
      queueDescription:
        "Быстрые срезы для handoff, escalation и необработанных заметок без ручной настройки фильтров.",
      queueOpenLabel: "Открытые",
      queueOpenHint: "все активные заметки",
      queueHandoffLabel: "Открытые handoff",
      queueHandoffHint: "требуют передачи смены",
      queueEscalationLabel: "Открытые escalation",
      queueEscalationHint: "нужен усиленный контроль",
      queueUnassignedLabel: "Не назначены",
      queueUnassignedHint: "ждут ответственного",
      queuePinnedLabel: "Закреплённые",
      queuePinnedHint: "закреплены наверху очереди",
      queueStaleLabel: "Застарелые 2ч+",
      queueStaleHint: "без обновления более 2 часов",
      queueCriticalLabel: "Критичные 12ч+",
      queueCriticalHint: "без обновления более 12 часов",
      filtersTitle: "Фильтры заметок",
      filtersDescription:
        "Быстрый поиск по типу объекта, типу заметки, pin-маркеру, возрасту, автору и тексту без перехода в отдельные карточки.",
      entityTypeLabel: "Тип объекта",
      entityIdLabel: "ID объекта",
      authorLabel: "Автор",
      assigneeLabel: "Ответственный",
      assignmentLabel: "Назначение",
      queryLabel: "Текст заметки",
      kindLabel: "Тип заметки",
      pinnedLabel: "Pin-маркер",
      stateLabel: "Состояние",
      agingLabel: "Возраст",
      limitLabel: "Лимит",
      allEntities: "Все объекты",
      allKinds: "Все типы",
      allPins: "Любой приоритет",
      allNoteStates: "Все состояния",
      allAging: "Любой возраст",
      allAssignments: "Любое назначение",
      assignedOnly: "Только назначенные",
      unassignedOnly: "Только без ответственного",
      pinnedOnly: "Только pinned",
      unpinnedOnly: "Только без pin",
      freshOnly: "Свежие",
      staleOnly: "Застарелые",
      criticalOnly: "Критичные",
      empty: "По выбранным фильтрам заметки не найдены.",
      openEntity: "Открыть объект",
    },
    activityPanel: {
      eyebrow: "Журнал действий",
      title: "Последняя активность",
      description:
        "Последние ручные действия операторов и администраторов по этой сущности без перехода в общий audit trail.",
      openFeedLabel: "Открыть журнал",
      totalLabel: "События",
      totalHint: "в локальной карточке",
      actorCountLabel: "Участники",
      actorCountHint: "операторы и system actor",
      noteOpsLabel: "Note-операции",
      noteOpsHint: "создание и обновление контекста",
      latestLabel: "Последнее событие",
      latestHint: "время последней ручной операции",
      empty: "Для этой сущности журнал действий пока пуст.",
    },
    activityPage: {
      totalEventsLabel: "Всего событий",
      totalEventsHint: "в текущей выборке",
      orderOpsLabel: "Операции заказов",
      orderOpsHint: "назначения, статусы и redispatch",
      noteOpsLabel: "Операции заметок",
      noteOpsHint: "создание и обновление внутреннего контекста",
      paymentOpsLabel: "Операции платежей",
      paymentOpsHint: "возвраты и отмена холда",
      moderationOpsLabel: "Операции модерации",
      moderationOpsHint: "клиенты, исполнители, города, тарифы и промокоды",
      eyebrow: "Журнал действий",
      title: "Лента операторской активности",
      description:
        "Единый audit trail по ручным действиям backoffice: кто менял заказ, платёж, заметку, профиль или справочник.",
      filtersTitle: "Фильтры активности",
      filtersDescription:
        "Собирайте срез по сущности, действию, оператору и metadata без перехода в отдельные разделы.",
      entityTypeLabel: "Тип сущности",
      entityIdLabel: "ID сущности",
      actorLabel: "Оператор",
      queryLabel: "Поиск по metadata",
      actionLabel: "Действие",
      groupLabel: "Группа",
      windowLabel: "Период",
      limitLabel: "Лимит",
      allEntities: "Все сущности",
      allActions: "Все действия",
      allGroups: "Все группы",
      allWindows: "Любой период",
      groupOrderLabel: "Заказы",
      groupOrderHint: "назначения, статусы и redispatch",
      groupPaymentLabel: "Платежи",
      groupPaymentHint: "возвраты и отмены hold",
      groupNoteLabel: "Заметки",
      groupNoteHint: "операции внутреннего контекста",
      groupModerationLabel: "Модерация",
      groupModerationHint: "профили и справочники",
      windowHourLabel: "Последний час",
      windowHourHint: "самые свежие ручные действия",
      windowDayLabel: "Последние 24 часа",
      windowDayHint: "операционный срез за сутки",
      windowWeekLabel: "Последние 7 дней",
      windowWeekHint: "недельный audit trail",
      empty: "По выбранным фильтрам события активности не найдены.",
      openEntity: "Открыть сущность",
      openActorLabel: "По оператору",
      openActionLabel: "По действию",
      systemActorLabel: "Система",
    },
    table: {
      id: "ID",
      service: "Сервис",
      route: "Маршрут",
      status: "Статус",
      payment: "Оплата",
      amount: "Сумма",
      createdAt: "Создан",
      routePending: "Маршрут уточняется",
      emptyOrders: "Нет заказов для отображения.",
    },
    citiesPanel: {
      empty: "Список городов пока пуст.",
      live: "Открыт",
      standby: "Резерв",
      currency: "Валюта",
      timezone: "Часовой пояс",
      country: "Страна",
    },
    tariffsPanel: {
      empty: "Активные тарифы не найдены.",
      active: "активен",
      archived: "архив",
      base: "База",
      perKm: "За км",
      perMinute: "За минуту",
      minimum: "Минимум",
    },
    reportsPanel: {
      paymentFlow: "Платёжный поток",
      captured: "Списано",
      refunded: "Возвращено",
      paymentsCount: "Количество платежей",
      completedOrders: "Завершённые заказы",
      serviceMix: "Структура сервисов",
      statusHeat: "Карта статусов",
    },
    usersPanel: {
      empty: "Клиенты в текущем потоке не найдены.",
    },
    executorsPanel: {
      empty: "Исполнители в текущем потоке не найдены.",
    },
    notesPanel: {
      eyebrow: "Внутренние заметки",
      title: "Операторские заметки",
      description:
        "Внутренний контекст по заказу, клиенту или исполнителю с handoff, escalation и pin-маркерами без выхода из backoffice.",
      createTitle: "Добавить заметку",
      createDescription:
        "Используйте короткие факты и решения, которые должны остаться внутри операционной команды.",
      openFeedLabel: "Открыть ленту",
      openQueueLabel: "Открытые",
      openEscalationsLabel: "Escalation",
      openActivityLabel: "Открыть активность",
      kindLabel: "Тип заметки",
      pinnedLabel: "Pin-маркер",
      stateLabel: "Состояние",
      assigneeLabel: "Ответственный",
      assigneePlaceholder: "UUID оператора или администратора",
      pinnedOn: "Закрепить вверху",
      pinnedOff: "Обычная заметка",
      pinnedBadge: "Pinned",
      unassignedLabel: "Не назначено",
      resolvedAtLabel: "Решено",
      archivedAtLabel: "Архивировано",
      updatedAtLabel: "Обновлено",
      bodyPlaceholder:
        "Например: клиент ожидает обратный звонок, исполнитель требует повторной проверки, заказ под ручным контролем.",
      empty: "Внутренних заметок по этому объекту пока нет.",
      authorFallback: "Оператор",
    },
    forms: {
      apply: "Применить",
      clear: "Сбросить",
      create: "Создать",
      save: "Сохранить",
      addNote: "Добавить заметку",
      activate: "Активировать",
      deactivate: "Выключить",
      archive: "Архивировать",
      assign: "Назначить",
      retry: "Перезапустить",
      cancel: "Отменить",
      refund: "Сделать возврат",
      block: "Заблокировать",
      unblock: "Разблокировать",
      orderId: "ID заказа",
      executorId: "ID исполнителя",
      userId: "ID клиента",
      payment: "Оплата",
      amount: "Сумма",
      address: "Адрес",
      refundAmount: "Сумма возврата",
      reason: "Причина",
      search: "Поиск",
      period: "Период",
      dateFrom: "Дата с",
      dateTo: "Дата по",
      status: "Статус",
      blockedState: "Блокировка",
      onlineState: "Онлайн-статус",
      verificationStatus: "Статус проверки",
      city: "Город",
      limit: "Лимит",
      serviceType: "Сервис",
      activeState: "Состояние",
      allStates: "Все",
      activeOnly: "Только активные",
      inactiveOnly: "Только неактивные",
      blockedOnly: "Только заблокированные",
      unblockedOnly: "Только активные профили",
      onlineOnly: "Только онлайн",
      offlineOnly: "Только офлайн",
      activeBadge: "Активен",
      inactiveBadge: "Неактивен",
      onlineBadge: "Онлайн",
      offlineBadge: "Офлайн",
      blockedBadge: "Заблокирован",
      unblockedBadge: "Доступен",
      nameRu: "Название RU",
      nameKk: "Название KK",
      name: "Имя",
      phone: "Телефон",
      language: "Язык",
      countryCode: "Код страны",
      currency: "Валюта",
      bonusBalance: "Бонусный баланс",
      timezone: "Часовой пояс",
      isActive: "Активен",
      executorType: "Тип исполнителя",
      vehicleType: "Тип транспорта",
      vehicleClass: "Класс / транспорт",
      assignedCarClass: "Назначенный класс",
      vehicleMake: "Марка",
      vehicleModel: "Модель",
      vehicleYear: "Год",
      vehiclePlate: "Госномер",
      carClassEconomy: "Эконом",
      carClassComfort: "Комфорт",
      carClassComfortPlus: "Комфорт плюс",
      carClassBusiness: "Бизнес",
      rating: "Рейтинг",
      cancelRate: "Доля отмен",
      balance: "Баланс",
      client: "Клиент",
      executor: "Исполнитель",
      pickup: "Подача",
      destination: "Назначение",
      distance: "Дистанция",
      duration: "Длительность",
      discountAmount: "Скидка",
      acceptedAt: "Принят",
      startedAt: "Начат",
      completedAt: "Завершён",
      cancelledAt: "Отменён",
      cancelReason: "Причина отмены",
      updatedAt: "Обновлён",
      clientRating: "Оценка клиента",
      executorRating: "Оценка исполнителя",
      contact: "Контакт",
      notes: "Комментарий",
      arrivedAt: "Прибыл",
      paymentStatus: "Статус платежа",
      provider: "Провайдер",
      providerTransactionId: "Транзакция провайдера",
      refundedAmount: "Возврат",
      capturedAt: "Списан",
      packageDescription: "Описание посылки",
      declaredValue: "Объявленная стоимость",
      fragile: "Хрупкий груз",
      requiresReturn: "Нужен возврат",
      cashOnDelivery: "Наложенный платёж",
      proofPhoto: "Фото подтверждения",
      proofSignature: "Подпись",
      recipientCode: "Код получателя",
      packagePhoto: "Фото посылки",
      metadata: "Метаданные",
      actorId: "ID инициатора",
      noteId: "ID заметки",
      source: "Источник",
      previousTariffId: "Предыдущий тариф",
      createdAt: "Создан",
      basePrice: "Базовая цена",
      pricePerKm: "Цена за км",
      pricePerMinute: "Цена за минуту",
      minimumPrice: "Минимальная цена",
      freeWaitingSeconds: "Бесплатное ожидание (сек)",
      paidWaitingPerMinute: "Платное ожидание / мин",
      commissionPercent: "Комиссия, %",
      commissionFixed: "Фиксированная комиссия",
      validFrom: "Действует с",
      validTo: "Действует до",
      code: "Код",
      discountType: "Тип скидки",
      discountValue: "Размер скидки",
      maxUses: "Максимум использований",
      percent: "Процент",
      fixed: "Фиксированная",
      noLimit: "Без лимита",
    },
    periods: {
      day: "день",
      week: "неделя",
      month: "месяц",
    },
    warnings: {
      adminApiTokenMissing:
        "ADMIN_API_TOKEN не задан, поэтому панель показывает встроенный demo snapshot.",
      adminApiUrlInvalid:
        "ADMIN_API_URL задан некорректно, поэтому панель показывает встроенный demo snapshot.",
      failedToLoad: (scope, detail) =>
        `Не удалось загрузить ${scope}: ${detail}`,
      scopeCities: "города",
      scopeTariffs: "тарифы",
      scopeOrders: "заказы",
      scopeFinancialReport: "финансовый отчёт",
      scopeOperationsReport: "операционный отчёт",
    },
    feedback: {
      cityCreated: "Город создан.",
      cityUpdated: "Город обновлён.",
      tariffCreated: "Тариф создан.",
      tariffUpdated: "Тариф обновлён.",
      promoCreated: "Промокод создан.",
      promoUpdated: "Промокод обновлён.",
      orderAssigned: "Заказ назначен исполнителю.",
      dispatchRestarted: "Поиск исполнителя перезапущен.",
      orderStatusUpdated: "Статус заказа обновлён.",
      paymentCancelled: "Холд по платежу отменён.",
      paymentRefunded: "Возврат по платежу выполнен.",
      userUpdated: "Профиль клиента обновлён.",
      executorVerified: "Статус верификации исполнителя обновлён.",
      executorBlocked: "Статус блокировки исполнителя обновлён.",
      executorBalanceTopUpUpdated: "Заявка пополнения обновлена.",
      executorPayoutCreated: "Выплата водителю создана.",
      executorPayoutUpdated: "Выплата водителю обновлена.",
      dispatchSettingsUpdated: "Настройки диспетчеризации обновлены.",
      driverBonusSettingsUpdated: "Настройки бонусов водителям обновлены.",
      noteCreated: "Внутренняя заметка добавлена.",
      noteUpdated: "Внутренняя заметка обновлена.",
      actionFailed: (detail) => `Операция не выполнена: ${detail}`,
    },
    enums: {
      serviceType: {
        taxi: "Такси",
        delivery: "Доставка",
        intercity: "Межгород",
        cargo: "Грузы",
        scooter: "Самокаты",
      },
      orderStatus: {
        draft: "Черновик",
        searching: "Поиск",
        accepted: "Принят",
        arriving: "Подъезжает",
        waiting: "Ожидание",
        in_progress: "В пути",
        delivered: "Доставлен",
        completed: "Завершён",
        cancelled_client: "Отменён клиентом",
        cancelled_executor: "Отменён исполнителем",
        cancelled_system: "Отменён системой",
        failed: "Ошибка",
      },
      deliveryStatus: {
        pending_pickup: "Ожидает забора",
        picked_up: "Забран",
        in_transit: "В доставке",
        at_door: "У двери",
        delivered_confirmed: "Вручён",
        delivery_failed: "Не доставлен",
        returning: "Возврат",
      },
      paymentMethod: {
        card: "Карта",
        cash: "Наличные",
        transfer_kaspi: "Перевод Kaspi",
        transfer_halyk: "Перевод Halyk",
        corporate: "Корпоративный",
        bonus: "Бонусы",
      },
      paymentStatus: {
        pending: "Ожидает",
        authorized: "Холд",
        captured: "Списан",
        refunded: "Возвращён",
        partially_refunded: "Частичный возврат",
        cancelled: "Отменён",
        failed: "Ошибка",
      },
      executorType: {
        driver: "Водитель",
        courier: "Курьер",
        cargo_driver: "Грузовой водитель",
      },
      vehicleType: {
        bicycle: "Велосипед",
        moped: "Мопед",
        scooter: "Самокат",
        car: "Авто",
      },
      verificationStatus: {
        pending: "На проверке",
        verified: "Проверен",
        rejected: "Отклонён",
      },
      adminNoteKind: {
        context: "Контекст",
        handoff: "Смена / handoff",
        escalation: "Эскалация",
      },
      adminNoteState: {
        open: "Открыта",
        resolved: "Решена",
        archived: "В архиве",
      },
      adminActivityEntityType: {
        order: "Заказ",
        user: "Клиент",
        executor: "Исполнитель",
        city: "Город",
        tariff: "Тариф",
        promo_code: "Промокод",
        payment: "Платёж",
      },
      adminActivityAction: {
        "city.created": "Создание города",
        "city.updated": "Обновление города",
        "tariff.created": "Создание тарифа",
        "tariff.updated": "Обновление тарифа",
        "order.created": "Создание заказа",
        "order.creation_requested": "Запрос создания заказа",
        "order.assigned": "Ручное назначение заказа",
        "order.status_updated": "Ручное изменение статуса заказа",
        "order.dispatch_retried": "Перезапуск диспетча",
        "note.created": "Создание внутренней заметки",
        "note.updated": "Обновление внутренней заметки",
        "user.updated": "Обновление клиента",
        "executor.updated": "Обновление исполнителя",
        "executor.verified": "Изменение верификации исполнителя",
        "executor.blocked": "Изменение блокировки исполнителя",
        "promo_code.created": "Создание промокода",
        "promo_code.updated": "Обновление промокода",
        "payment.refunded": "Возврат платежа",
        "payment.cancelled": "Отмена холда платежа",
      },
    },
  },
  kk: {
    nav: {
      dashboard: "Шолу",
      orders: "Тапсырыстар",
      cities: "Қалалар",
      tariffs: "Тарифтер",
      reports: "Есептер",
      promoCodes: "Промокодтар",
      users: "Клиенттер",
      executors: "Орындаушылар",
      balanceTopUps: "Толтырулар",
      payouts: "Төлемдер",
      settings: "Баптаулар",
      notes: "Ескертпелер",
      activity: "Белсенділік",
    },
    shell: {
      eyebrow: "DOS Backoffice",
      title: "Операциялық штаб",
      description:
        "Диспетчерлеу, тарифтер, қалалар және тірі тапсырыстарға арналған операциялық қабат.",
      activeOrders: "Белсенді тапсырыстар",
      citiesOnline: "Онлайн қалалар",
      source: "Дереккөз",
      runtime: "Режим",
      updatedAt: "Жаңартылды",
      backendBase: "Backend мекенжайы",
      open: "Ашу",
      language: "Тіл",
      languageRu: "Рус",
      languageKk: "Қаз",
      liveApi: "Тірі API",
      partialApi: "Ішінара API",
      demoSnapshot: "Демо-қима",
    },
    dashboard: {
      heroTitle:
        "Қалалар, тарифтер және тірі тапсырыстардың операциялық контуры",
      heroDescription:
        "Панель ағымдағы API-модульдеріне негізделген: диспетчерлеу, тарифтер, белсенді сапарлар, жеткізу және қаржы. Егер backend қолжетімсіз болса, экран құрылымын жоғалтпай demo snapshot режиміне ауысады.",
      contourLabel: "Контур: dispatch, pricing, orders, reports",
      activeOrdersLabel: "Белсенді тапсырыстар",
      activeOrdersHint: (count) => `${count} тағайындауды күтуде`,
      onlineExecutorsLabel: "Онлайн орындаушылар",
      onlineExecutorsHint: (count) => `${count} расталған`,
      revenueLabel: "Күндік түсім",
      revenueHint: (count) => `${count} төлем`,
      refundsLabel: "Қайтарымдар",
      refundsHint: (count) => `${count} аяқталған тапсырыс`,
      dispatchEyebrow: "Диспетч пульсі",
      dispatchTitle: "Тірі тапсырыстар ағыны",
      dispatchDescription:
        "Қазір оператор бақылауы қажет тапсырыстардың кесіндісі.",
      dispatchAside: (count) => `${count} delivery`,
      citiesEyebrow: "Қалалар",
      citiesTitle: "Қалалар мен аймақтар",
      citiesDescription: "Қазір тапсырыс қабылдауға ашық тұрған қалалар.",
      citiesAside: (count) => `${count} active`,
      tariffsEyebrow: "Тарифтер",
      tariffsTitle: "Белсенді тариф нұсқалары",
      tariffsDescription:
        "Жаңа тапсырыстар осы конфигурациялар бойынша есептелуі тиіс.",
      reportsEyebrow: "Қаржы",
      reportsTitle: "Күндік экономика",
      reportsDescription:
        "Есептен шығару, қайтару және операциялық жүктеме кесіндісі.",
      pendingExecutorsEyebrow: "Жылдам тексеру",
      pendingExecutorsTitle: "Мақұлдауды күткен жүргізушілер",
      pendingExecutorsDescription:
        "Автокөлік класын тағайындап, тексеру күйін бірден жаңартыңыз.",
      pendingExecutorsAside: (count) => `${count} шешім күтуде`,
    },
    settingsPage: {
      title: "Жүйе баптаулары",
      description:
        "Backend қолданбаларды қайта жинамай қолданатын операциялық параметрлер.",
      dispatchEyebrow: "Диспетчерлеу",
      dispatchTitle: "Орындаушылар радиусы және ранжирлеу",
      dispatchDescription:
        "Тапсырыс тек радиус ішіндегі орындаушыларға ұсынылады. Қорытынды ұпай қашықтық, рейтинг, геопозиция жаңалығы және приоритет бойынша есептеледі.",
      maxRadiusKm: "Тағайындау радиусы, км",
      maxRadiusHint: "Әдепкі мәні 3 км.",
      distanceWeight: "Қашықтық салмағы",
      ratingWeight: "Рейтинг салмағы",
      activityWeight: "Белсенділік салмағы",
      priorityWeight: "Приоритет салмағы",
      maxCandidates: "Кезектегі кандидаттар",
      bonusEyebrow: "Жүргізуші бонустары",
      bonusTitle: "Орындалған тапсырыстар бонусы",
      bonusDescription:
        "Backend жүргізуші балансына берілген аяқталған тапсырыс санына жеткенде бонус қосады. Қолданбаны жаңарту қажет емес.",
      bonusEnabled: "Бонусты қосу",
      bonusOrdersRequired: "Қанша тапсырыс орындау керек",
      bonusAmount: "Бонус сомасы, ₸",
      bonusHint:
        "Қазір: 20 тапсырыс = 5 000 ₸. Бонус 20, 40, 60 тапсырыста қайталанады.",
    },
    ordersPage: {
      liveOrdersLabel: "Тірі тапсырыстар",
      liveOrdersHint: (count) => `${count} іздеуде`,
      deliveryFlowLabel: "Delivery ағыны",
      deliveryFlowHint: "белсенді және аяқталғандарын қоса",
      completedLabel: "Аяқталды",
      completedHint: "ағымдағы snapshot ішінде",
      totalFeedLabel: "Лентадағы барлығы",
      totalFeedHint: "қаладағы соңғы оқиғалар",
      liveEyebrow: "Операциялар",
      liveTitle: "Маңызды тапсырыстар",
      liveDescription:
        "Мұнда қазір оператор бақылауын қажет ететін тапсырыстар жиналған.",
      liveAside: (count) => `${count} live`,
      historyEyebrow: "Тарих",
      historyTitle: "Соңғы аяқталғандар",
      historyDescription: "Соңғы сапарлар мен жеткізілімдерге жылдам аудит.",
      historyAside: (count) => `${count} done`,
      emptyActiveOrders: "Қазір белсенді тапсырыстар жоқ.",
      emptyCompletedOrders: "Әзірге аяқталған тапсырыстар жоқ.",
      filtersTitle: "Тапсырыс сүзгілері",
      filtersDescription:
        "Беттің құрылымын өзгертпей күй, қала және шығару көлемі бойынша жылдам іріктеу.",
      assignTitle: "Қолмен тағайындау",
      assignDescription:
        "Іздеуде тұрған тапсырысқа орындаушыны қолмен бекіту үшін осы блокты қолданыңыз.",
    },
    orderDetailPage: {
      eyebrow: "Тапсырыс картасы",
      title: (orderId) => `${orderId} тапсырысы`,
      description:
        "Тапсырыс бойынша толық контекст: клиент, орындаушы, маршрут, төлем және күй өзгерістерінің таймлайны.",
      backToOrders: "Тізімге оралу",
      notFoundTitle: "Тапсырыс табылмады",
      notFoundDescription:
        "Бұл идентификатор бойынша live API-де де, demo snapshot-та да дерек жоқ.",
      overviewTitle: "Тапсырыс шолуы",
      overviewDescription:
        "Тапсырыстың негізгі атрибуттары және өмірлік циклдің басты уақыт нүктелері.",
      actorsTitle: "Тапсырыс қатысушылары",
      actorsDescription:
        "Тапсырыстың ағымдағы күйімен байланысты клиент пен орындаушы.",
      routeTitle: "Маршрут пен нүктелер",
      routeDescription:
        "Әр маршрут нүктесі бойынша мекенжайлар, байланыстар және келу белгілері.",
      deliveryTitle: "Жеткізу деректері",
      deliveryDescription:
        "Жеткізу тапсырыстары үшін сәлемдеме параметрлері, COD және тапсыру дәлелі.",
      paymentsTitle: "Төлемдер",
      paymentsDescription:
        "Төлем әрекеттері, есептен шығару күйлері және провайдер деректері.",
      timelineTitle: "Күй таймлайны",
      timelineDescription:
        "Backend осы тапсырыс бойынша тіркеген барлық күй ауысулары.",
      actionsTitle: "Оператор әрекеттері",
      actionsDescription:
        "Диспетчті қайта іске қосу, орындаушыны тағайындау, инцидентті қолмен жабу және төлем әрекеттері.",
      redispatchHint:
        "Іздеудегі тапсырыс үшін орындаушыны қайта іздеуді бастайды және алдыңғы аяқталмаған офферлерді жабады.",
      statusUpdateHint:
        "Тұрып қалған тапсырыстар үшін оператор тапсырысты тек system cancel немесе failed күйіне ауыстыра алады.",
      cancellableHint:
        "Бас тарту тек шегеру әлі болмаған холд күйіндегі төлемдер үшін қолжетімді.",
      noVerifiedExecutors:
        "Бұл қала үшін қолжетімді расталған орындаушылар жоқ.",
      refundableHint:
        "Қайтарым тек есептен шығарылған немесе ішінара қайтарылған төлемдер үшін қолжетімді.",
      missingExecutor: "Орындаушы әлі тағайындалмаған.",
      missingDelivery: "Бұл тапсырыс үшін delivery details блогы жоқ.",
      missingPayments: "Төлем жазбалары әзірге жоқ.",
      missingTimeline: "Күй ауысуларының таймлайны әзірге бос.",
      routePointLabel: (index) => `${index + 1}-нүкте`,
      yes: "Иә",
      no: "Жоқ",
    },
    citiesPage: {
      totalCitiesLabel: "Жүйедегі қалалар",
      totalCitiesHint: "қазір snapshot ішінде бар",
      activeLabel: "Белсенді",
      activeHint: "тапсырыс қабылдайды",
      standbyLabel: "Күту",
      standbyHint: "клиенттер үшін ашық емес",
      marketsLabel: "KZ нарықтары",
      marketsHint: "Қазақстандағы қалалар саны",
      eyebrow: "Қамту",
      title: "Қалалар мен қызмет аймақтары",
      description:
        "Қалалар тізімін, валютаны және production статустарын бақылау.",
      aside: (count) => `${count} open now`,
      filtersTitle: "Қала сүзгілері",
      filtersDescription:
        "ID, атау, валюта, ел коды және timezone бойынша жылдам іздеу.",
      createTitle: "Қала қосу",
      createDescription:
        "Жаңа нарық құрып, оның базалық валютасын және іске қосылу күйін бірден көрсетіңіз.",
    },
    tariffsPage: {
      totalTariffsLabel: "Тарифтер саны",
      totalTariffsHint: "snapshot ішінде қолжетімді",
      activeVersionsLabel: "Белсенді нұсқалар",
      activeVersionsHint: "есептеуде қолданылады",
      taxiLabel: "Такси",
      taxiHint: "такси кластары бойынша",
      deliveryLabel: "Жеткізу",
      deliveryHint: "курьер түрлері бойынша",
      eyebrow: "Баға есептеу",
      title: "Тариф конфигурациялары",
      description:
        "Backend estimate және create order кезінде қолданатын баға қабаттары.",
      aside: (count) => `${count} active`,
      filtersTitle: "Тариф сүзгілері",
      filtersDescription:
        "Жаңартудан бұрын қала, сервис және тариф күйі бойынша іріктеңіз.",
      createTitle: "Тариф құру",
      createDescription:
        "Жаңа тариф жазбасы құнды есептеу үшін бірден қолжетімді болады.",
    },
    reportsPage: {
      capturedLabel: "Шегерілген KZT",
      capturedHint: "кезеңдегі есептен шығарулар сомасы",
      refundedLabel: "Қайтарылған KZT",
      refundedHint: "қайтарулар мен түзетулер",
      totalOrdersLabel: "Барлық тапсырыс",
      totalOrdersHint: "операциялық жүктеме",
      executorsActiveLabel: "Белсенді орындаушылар",
      executorsActiveHint: (count) => `${count} расталған`,
      eyebrow: "Есептер",
      title: "Қаржылық және операциялық кесінді",
      description:
        "Төлем ағынын, қызмет құрылымын және статустарды күнделікті тексеруге арналған блок.",
      filtersTitle: "Есеп сүзгілері",
      filtersDescription:
        "Кезең мен қала бойынша аналитиканы басқа экранға өтпей тексеріңіз.",
    },
    promoCodesPage: {
      title: "Промокодтар",
      description:
        "Клиенттік жеңілдіктер мен маркетингтік ұсыныстарды басқару.",
      filtersTitle: "Промокод сүзгілері",
      filtersDescription:
        "Промокодтарды ID, код, жеңілдік түрі немесе мәні бойынша тез табыңыз.",
      createEyebrow: "Құру",
      createTitle: "Жаңа промокод",
      createDescription:
        "MVP кезеңі үшін тұрақты жеңілдік немесе пайыздық акция жасаңыз.",
      listEyebrow: "Тізім",
      listTitle: "Ағымдағы промокодтар",
      listDescription:
        "Қолданыстағы жеңілдіктердің белсенділігін және өмірлік циклін бақылау.",
    },
    usersPage: {
      totalUsersLabel: "Лентадағы клиенттер",
      totalUsersHint: "ағымдағы тапсырыс лентасындағы профилдер",
      blockedLabel: "Блокталғандар",
      blockedHint: "қолдау назарын қажет етеді",
      ruLabel: "RU профилдері",
      ruHint: "әдепкі орыс тілі",
      kkLabel: "KK профилдері",
      kkHint: "әдепкі қазақ тілі",
      eyebrow: "Клиенттер",
      title: "Клиент профилдері",
      description:
        "Қазіргі тапсырыс ағынына қатысып жатқан клиенттердің жұмыс реестрі.",
      filtersTitle: "Клиент сүзгілері",
      filtersDescription: "Блоктау және интерфейс тілі бойынша жылдам іріктеу.",
    },
    userDetailPage: {
      eyebrow: "Клиент картасы",
      title: (value) => `${value} клиенті`,
      description:
        "Клиент профилі, жылдам әрекеттер және ағымдағы операциялық кесіндідегі байланысты тапсырыстар.",
      backToUsers: "Клиенттерге оралу",
      notFoundTitle: "Клиент табылмады",
      notFoundDescription:
        "Бұл идентификатор бойынша live API-де де, demo snapshot-та да дерек жоқ.",
      totalOrdersLabel: "Барлық тапсырыс",
      profileTitle: "Клиент профилі",
      profileDescription:
        "Байланыстар, тіл, валюта және блоктау күйін осы жерден жаңартуға болады.",
      summaryTitle: "Операциялық шолу",
      summaryDescription:
        "Клиентке байланысты тапсырыстардағы мәртебе, сервис және төлем тәсілдерінің кесіндісі.",
      cancelledLabel: "Бас тарту және ақаулар",
      cancelledHint: "cancelled_* және failed",
      taxiLabel: "Такси",
      taxiHint: "байланысты тапсырыстар бойынша",
      deliveryLabel: "Жеткізу",
      deliveryHint: "байланысты тапсырыстар бойынша",
      paymentMixLabel: "Төлем тәсілдері",
      lastOrderLabel: "Соңғы тапсырыс",
      lastRouteLabel: "Соңғы маршрут",
      ordersTitle: "Байланысты тапсырыстар",
      ordersDescription:
        "Осы клиенттің current backoffice feed ішіндегі соңғы тапсырыстары.",
      emptyOrders:
        "Бұл клиент үшін ағымдағы тапсырыс кесіндісінде ештеңе табылмады.",
    },
    cityDetailPage: {
      eyebrow: "Қала картасы",
      title: (value) => `${value} қаласы`,
      description:
        "Қала бойынша контекст: валюта, timezone, байланысты тарифтер және тапсырыс ағыны.",
      backToCities: "Қалаларға оралу",
      notFoundTitle: "Қала табылмады",
      notFoundDescription:
        "Бұл идентификатор бойынша live API-де де, demo snapshot-та да дерек жоқ.",
      summaryTitle: "Қала шолуы",
      summaryDescription:
        "Қаланың негізгі атрибуттары және ағымдағы кесіндінің операциялық жүктемесі.",
      editTitle: "Қаланы өңдеу",
      editDescription:
        "Атауларды, елді, валютаны, timezone және белсенділік күйін бір карточкадан жаңартыңыз.",
      tariffsTitle: "Қала тарифтері",
      tariffsDescription:
        "Қазір осы қалаға байланысты барлық тарифтік жазбалар.",
      ordersTitle: "Қала тапсырыстары",
      ordersDescription:
        "Жылдам операциялық аудит үшін осы қалада құрылған соңғы тапсырыстар.",
      emptyOrders: "Бұл қала бойынша ағымдағы snapshot ішінде тапсырыс жоқ.",
    },
    executorsPage: {
      totalExecutorsLabel: "Лентадағы орындаушылар",
      totalExecutorsHint:
        "ағымдағы тапсырыс лентасындағы жүргізушілер мен курьерлер",
      onlineLabel: "Қазір онлайн",
      onlineHint: "тапсырыс қабылдауға дайын",
      verifiedLabel: "Расталғандар",
      verifiedHint: "верификациядан өткен",
      blockedLabel: "Блокталғандар",
      blockedHint: "ұсыныс алмауы тиіс",
      eyebrow: "Орындаушылар",
      title: "Жүргізушілер мен курьерлер реестрі",
      description:
        "Backoffice ішінен тікелей верификация және блоктау бар орындаушылардың операциялық кесіндісі.",
      filtersTitle: "Орындаушы сүзгілері",
      filtersDescription:
        "Тексеру күйі, онлайн мәртебесі және қала бойынша іріктеу.",
    },
    balanceTopUpsPage: {
      totalLabel: "Барлық өтінім",
      totalHint: "таңдалған сүзгі бойынша",
      pendingLabel: "Жаңа",
      pendingHint: "шот шығару керек",
      invoicedLabel: "Шот шығарылды",
      invoicedHint: "төлем күтілуде",
      confirmedLabel: "Есепке түсті",
      confirmedHint: "баланс толықтырылды",
      eyebrow: "Баланс",
      title: "Жүргізушілер балансын толықтыру өтінімдері",
      description:
        "Жүргізуші сома мен телефонды қалдырады. Админ Kaspi шотын шығарып, төлемнен кейін балансты толықтырады.",
      filtersTitle: "Өтінім сүзгісі",
      filtersDescription:
        "Жаңа, шот қойылған, расталған немесе қабылданбаған өтінімдерді таңдаңыз.",
      listTitle: "Толтыру кезегі",
      listDescription:
        "Бұл жерде жүргізушілердің жеке шотты толықтыру өтінімдері көрсетіледі.",
      activeListTitle: "Белсенді өтінімдер",
      activeListDescription:
        "Мұнда жаңа өтінімдер мен қойылған шоттар ғана. Толықтырылғаннан кейін карта тарихқа өтеді.",
      historyTitle: "Толтыру тарихы",
      historyDescription:
        "Расталған және қабылданбаған өтінімдер, қайталама әрекеттерсіз.",
      empty: "Бұл сүзгі бойынша өтінім жоқ.",
      allStatuses: "Барлық мәртебелер",
      phoneLabel: "Шотқа арналған телефон",
      executorLabel: "Орындаушы",
      requestedAtLabel: "Құрылды",
      updatedAtLabel: "Жаңартылды",
      adminCommentLabel: "Пікір",
      adminCommentPlaceholder: "Мысалы: Kaspi шоты шығарылды",
      creditAmountLabel: "Есепке түсетін сома",
      markInvoiced: "Kaspi шоты шығарылды",
      confirmAndCredit: "Растау және толықтыру",
      reject: "Қабылдамау",
      openExecutor: "Жүргізушіні ашу",
      status: {
        pending: "Жаңа",
        invoiced: "Шот шығарылды",
        confirmed: "Есепке түсті",
        rejected: "Қабылданбады",
      },
    },
    executorDetailPage: {
      eyebrow: "Орындаушы картасы",
      title: (value) => `${value} орындаушысы`,
      description:
        "Орындаушы профилі, тексеру статустары және ағымдағы операциялық кесіндідегі байланысты тапсырыстар.",
      backToExecutors: "Орындаушыларға оралу",
      notFoundTitle: "Орындаушы табылмады",
      notFoundDescription:
        "Бұл идентификатор бойынша live API-де де, demo snapshot-та да дерек жоқ.",
      totalOrdersLabel: "Барлық тапсырыс",
      profileTitle: "Орындаушы профилі",
      profileDescription:
        "Верификация, онлайн күйі және блоктау бойынша жылдам операторлық әрекеттер.",
      summaryTitle: "Операциялық шолу",
      summaryDescription:
        "Орындаушының байланысты тапсырыстарындағы мәртебе, сервис және төлем тәсілдерінің кесіндісі.",
      cancelledLabel: "Бас тарту және ақаулар",
      cancelledHint: "cancelled_* және failed",
      taxiLabel: "Такси",
      taxiHint: "байланысты тапсырыстар бойынша",
      deliveryLabel: "Жеткізу",
      deliveryHint: "байланысты тапсырыстар бойынша",
      paymentMixLabel: "Төлем тәсілдері",
      lastOrderLabel: "Соңғы тапсырыс",
      lastRouteLabel: "Соңғы маршрут",
      ordersTitle: "Байланысты тапсырыстар",
      ordersDescription:
        "Осы орындаушының current backoffice feed ішіндегі соңғы тапсырыстары.",
      emptyOrders:
        "Бұл орындаушы үшін ағымдағы тапсырыс кесіндісінде ештеңе табылмады.",
    },
    tariffDetailPage: {
      eyebrow: "Тариф картасы",
      title: (value) => `${value} тарифі`,
      description:
        "Тариф конфигурациясы, байланысты қала және осы қабатпен есептелуі мүмкін тапсырыстар.",
      backToTariffs: "Тарифтерге оралу",
      notFoundTitle: "Тариф табылмады",
      notFoundDescription:
        "Бұл идентификатор бойынша live API-де де, demo snapshot-та да дерек жоқ.",
      summaryTitle: "Тариф шолуы",
      summaryDescription:
        "Тарифтің негізгі параметрлері, валютасы және қолданылу терезесі.",
      editTitle: "Тарифті жаңарту",
      editDescription:
        "Коммерциялық параметрлер өзгерсе, жаңа тариф нұсқасы жасалады, ал қолданылу мерзімі мен белсенділік ағымдағы жазбада жаңартылады.",
      cityTitle: "Байланысты қала",
      cityDescription: "Бұл тариф конфигурациясы қолданылатын қала.",
      ordersTitle: "Тапсырыс ағыны",
      ordersDescription:
        "Тарифтің әсерін жылдам бағалау үшін сол сервистің қаладағы соңғы тапсырыстары.",
      emptyOrders: "Бұл тариф үшін snapshot ішінде байланысты тапсырыс жоқ.",
    },
    promoCodeDetailPage: {
      eyebrow: "Промокод картасы",
      title: (value) => `${value} промокоды`,
      description:
        "Промокодтың күйі және операторлық әрекеттер тарихы бойынша контекст.",
      backToPromoCodes: "Промокодтарға оралу",
      notFoundTitle: "Промокод табылмады",
      notFoundDescription:
        "Бұл идентификатор бойынша live API-де де, demo snapshot-та да дерек жоқ.",
      summaryTitle: "Промокод шолуы",
      summaryDescription:
        "Жеңілдік түрі, лимиттер, мерзімі және ағымдағы күйі.",
      filtersTitle: "Аналитика сүзгілері",
      filtersDescription:
        "Промокод тарихын кезең, нақты күн диапазоны және қала бойынша тарылтып, KPI мен тапсырыс тізімін бір уақытта жаңартыңыз.",
      fullHistoryLabel: "Толық тарих",
      customRangeLabel: "Нақты диапазон",
      editTitle: "Промокодты өңдеу",
      editDescription:
        "Кодты, жеңілдік түрін, лимиттерді және белсенділікті жалпы тізімге өтпей-ақ өзгертіңіз.",
      relatedOrdersLabel: "Байланысты тапсырыстар",
      relatedOrdersHint: "қолжетімді аналитикалық контурда",
      completedOrdersLabel: "Аяқталғандар",
      completedOrdersHint: "осы промокодты пайдалану тарихы бойынша",
      analyticsTitle: "Промокод әсері",
      analyticsDescription:
        "Промокод қолданылуының шолуы: жалпы айналым, берілген жеңілдік, completion rate және сервис mix. Live API барда толық тарихпен, әйтпесе fallback snapshot-пен құрылады.",
      grossValueLabel: "Жалпы айналым",
      grossValueHint: "байланысты тапсырыстардың final не estimated сомасы",
      discountTotalLabel: "Берілген жеңілдік",
      discountTotalHint:
        "промокодпен тапсырыстар бойынша жиынтық discountAmount",
      completionRateLabel: "Completion rate",
      completionRateHint:
        "барлық байланысты тапсырыстардың ішіндегі аяқталғандары",
      lastRedeemedLabel: "Соңғы қолданылуы",
      lastRedeemedHint: "промокодпен соңғы тапсырыстың жасалған уақыты",
      taxiOrdersLabel: "Такси",
      taxiOrdersHint: "осы промокодпен өткен taxi тапсырыстарының саны",
      deliveryOrdersLabel: "Жеткізу",
      deliveryOrdersHint: "осы промокодпен өткен delivery тапсырыстарының саны",
      firstTimeUsageLabel: "Алғашқы қолдану",
      firstTimeUsageHint:
        "қолжетімді дерек контурында промокод клиенттің алғашқы тапсырысына түскен редемпшндер",
      repeatUsageLabel: "Қайта қолдану",
      repeatUsageHint:
        "қолжетімді дерек контурында бұрынырақ тапсырысы бар клиенттердің редемпшндері",
      uniqueClientsLabel: "Бірегей клиенттер",
      uniqueClientsHint:
        "қолжетімді дерек контурында промокодты қолданған әртүрлі клиенттер саны",
      usageRateLabel: "Лимитті пайдалану",
      usageRateHint:
        "ағымдағы редемпшндердің maxUses-ке қатынасы; лимитсіз промокодтарда шек қолданылмайды",
      firstOrderConversionLabel: "First-order conversion",
      firstOrderConversionHint:
        "қолжетімді аналитикалық контурда промокод алғашқы тапсырысқа түскен бірегей клиенттердің үлесі",
      citySplitTitle: "Қолданылған қалалар",
      citySplitDescription:
        "Қалалар бойынша тапсырыс саны, жалпы айналым, жеңілдік және completed flow разрезі.",
      emptyCitySplit:
        "Бұл промокод үшін қолжетімді аналитикалық контурда қалалық разрез әлі бос.",
      paymentMixTitle: "Төлем құрылымы",
      paymentMixDescription:
        "Ағымдағы аналитикалық скоупта промокод қолданылуының төлем тәсілдері бойынша разрезі.",
      emptyPaymentMix:
        "Таңдалған скоуп бойынша бұл промокод үшін төлем тәсілдері жайлы дерек әлі жоқ.",
      statusBreakdownTitle: "Күй құрылымы",
      statusBreakdownDescription:
        "Ағымдағы аналитикалық скоупта осы промокодпен өткен тапсырыстардың финалдық күйлері бойынша разрезі.",
      emptyStatusBreakdown:
        "Таңдалған скоуп бойынша бұл промокод үшін күйлер жайлы дерек әлі жоқ.",
      cityOrdersLabel: "Тапсырыстар",
      cityGrossLabel: "Жалпы айналым",
      cityDiscountLabel: "Жеңілдік",
      cityCompletedLabel: "Аяқталған",
      cityShareHint: (share) => `осы промокодпен барлық тапсырыстың ${share}`,
      openScopedOrdersLabel: "Тапсырыстарды ашу",
      ordersTitle: "Промокодпен тапсырыстар",
      ordersDescription:
        "Операциялық әсерін бағалау үшін осы промокод қолданылған соңғы тапсырыстар, тарихи admin feed не fallback snapshot арқылы.",
      ordersPageHint: (count) => `ағымдағы терезеде ${count} тапсырыс`,
      nextPageLabel: "Келесі бет",
      firstPageLabel: "Бірінші бетке",
      emptyOrders:
        "Бұл промокод бойынша қолжетімді тапсырыс контурында ештеңе табылмады.",
    },
    notesPage: {
      totalNotesLabel: "Барлық ескертпе",
      totalNotesHint: "ағымдағы іріктеуде",
      orderNotesLabel: "Тапсырыстар бойынша",
      orderNotesHint: "тапсырыстардың операциялық кейстері",
      userNotesLabel: "Клиенттер бойынша",
      userNotesHint: "клиент профилдері бойынша контекст",
      executorNotesLabel: "Орындаушылар бойынша",
      executorNotesHint: "жүргізушілер мен курьерлер бойынша контекст",
      cityNotesLabel: "Қалалар бойынша",
      cityNotesHint: "сервистік контурлар бойынша контекст",
      tariffNotesLabel: "Тарифтер бойынша",
      tariffNotesHint: "тариф саясатының өзгерістері",
      promoCodeNotesLabel: "Промокодтар бойынша",
      promoCodeNotesHint: "маркетинг және support-кейстер",
      eyebrow: "Ішкі ескертпелер",
      title: "Операторлық ескертпелер лентасы",
      description:
        "Объект, ескертпе түрі, pin-маркер, автор және мазмұн бойынша сүзгілері бар ішкі ескертпелердің бірыңғай реестрі.",
      queueTitle: "Операторлық кезектер",
      queueDescription:
        "Handoff, escalation және өңделмеген ескертпелер бойынша фильтрді қолмен жинамайтын жылдам кесінділер.",
      queueOpenLabel: "Ашықтар",
      queueOpenHint: "барлық белсенді ескертпе",
      queueHandoffLabel: "Ашық handoff",
      queueHandoffHint: "ауысымға беруді күтеді",
      queueEscalationLabel: "Ашық escalation",
      queueEscalationHint: "күшейтілген бақылау керек",
      queueUnassignedLabel: "Тағайындалмаған",
      queueUnassignedHint: "жауаптыны күтеді",
      queuePinnedLabel: "Бекітілгендер",
      queuePinnedHint: "кезектің жоғарғы бөлігіне бекітілген",
      queueStaleLabel: "Ескірген 2сағ+",
      queueStaleHint: "2 сағаттан көп жаңартылмаған",
      queueCriticalLabel: "Критикалық 12сағ+",
      queueCriticalHint: "12 сағаттан көп жаңартылмаған",
      filtersTitle: "Ескертпе сүзгілері",
      filtersDescription:
        "Жеке карточкаға өтпей-ақ объект түрі, ескертпе түрі, pin-маркер, жасы, авторы және мәтіні бойынша жылдам іздеу.",
      entityTypeLabel: "Объект түрі",
      entityIdLabel: "Объект ID",
      authorLabel: "Автор",
      assigneeLabel: "Жауапты",
      assignmentLabel: "Тағайындау",
      queryLabel: "Ескертпе мәтіні",
      kindLabel: "Ескертпе түрі",
      pinnedLabel: "Pin-маркер",
      stateLabel: "Күйі",
      agingLabel: "Жасы",
      limitLabel: "Лимит",
      allEntities: "Барлық объект",
      allKinds: "Барлық түр",
      allPins: "Кез келген басымдық",
      allNoteStates: "Барлық күй",
      allAging: "Кез келген жас",
      allAssignments: "Кез келген тағайындау",
      assignedOnly: "Тек тағайындалған",
      unassignedOnly: "Тек жауаптысыз",
      pinnedOnly: "Тек pinned",
      unpinnedOnly: "Тек pin-сыз",
      freshOnly: "Жаңа",
      staleOnly: "Ескірген",
      criticalOnly: "Критикалық",
      empty: "Таңдалған сүзгілер бойынша ескертпелер табылмады.",
      openEntity: "Объектіні ашу",
    },
    activityPanel: {
      eyebrow: "Әрекеттер журналы",
      title: "Соңғы белсенділік",
      description:
        "Ортақ audit trail бетіне өтпей-ақ осы объект бойынша операторлар мен әкімшілердің соңғы қолмен жасаған әрекеттері.",
      openFeedLabel: "Журналды ашу",
      totalLabel: "Оқиғалар",
      totalHint: "осы карточка шегінде",
      actorCountLabel: "Қатысушылар",
      actorCountHint: "операторлар және system actor",
      noteOpsLabel: "Note-операциялар",
      noteOpsHint: "контексті құру және жаңарту",
      latestLabel: "Соңғы оқиға",
      latestHint: "соңғы қолмен әрекет уақыты",
      empty: "Бұл объект үшін әрекеттер журналы әзірге бос.",
    },
    activityPage: {
      totalEventsLabel: "Барлық оқиға",
      totalEventsHint: "ағымдағы іріктеуде",
      orderOpsLabel: "Тапсырыс операциялары",
      orderOpsHint: "тағайындау, күйлер және redispatch",
      noteOpsLabel: "Ескертпе операциялары",
      noteOpsHint: "ішкі контексті құру және жаңарту",
      paymentOpsLabel: "Төлем операциялары",
      paymentOpsHint: "қайтарымдар және холдты тоқтату",
      moderationOpsLabel: "Модерация операциялары",
      moderationOpsHint:
        "клиенттер, орындаушылар, қалалар, тарифтер және промокодтар",
      eyebrow: "Әрекеттер журналы",
      title: "Операторлық белсенділік лентасы",
      description:
        "Backoffice-тегі қолмен жасалған әрекеттер бойынша бірыңғай audit trail: тапсырысты, төлемді, ескертпені, профильді немесе анықтамалықты кім өзгерткенін көрсетеді.",
      filtersTitle: "Белсенділік сүзгілері",
      filtersDescription:
        "Entity, action, оператор және metadata мәтіні бойынша кесінді құрып, бөлек бөлімдерге өтпей-ақ оқыңыз.",
      entityTypeLabel: "Субъект түрі",
      entityIdLabel: "Субъект ID",
      actorLabel: "Оператор",
      queryLabel: "Metadata бойынша іздеу",
      actionLabel: "Әрекет",
      groupLabel: "Топ",
      windowLabel: "Кезең",
      limitLabel: "Лимит",
      allEntities: "Барлық entity",
      allActions: "Барлық әрекет",
      allGroups: "Барлық топ",
      allWindows: "Кез келген кезең",
      groupOrderLabel: "Тапсырыстар",
      groupOrderHint: "тағайындаулар, күйлер және redispatch",
      groupPaymentLabel: "Төлемдер",
      groupPaymentHint: "қайтарымдар және hold тоқтатулары",
      groupNoteLabel: "Ескертпелер",
      groupNoteHint: "ішкі контекст операциялары",
      groupModerationLabel: "Модерация",
      groupModerationHint: "профильдер мен анықтамалықтар",
      windowHourLabel: "Соңғы сағат",
      windowHourHint: "ең жаңа қолмен әрекеттер",
      windowDayLabel: "Соңғы 24 сағат",
      windowDayHint: "тәуліктік операциялық кесінді",
      windowWeekLabel: "Соңғы 7 күн",
      windowWeekHint: "апталық audit trail",
      empty: "Таңдалған сүзгілер бойынша белсенділік оқиғалары табылмады.",
      openEntity: "Субъектіні ашу",
      openActorLabel: "Оператор бойынша",
      openActionLabel: "Әрекет бойынша",
      systemActorLabel: "Жүйе",
    },
    table: {
      id: "ID",
      service: "Қызмет",
      route: "Маршрут",
      status: "Күй",
      payment: "Төлем",
      amount: "Сома",
      createdAt: "Құрылған",
      routePending: "Маршрут нақтылануда",
      emptyOrders: "Көрсету үшін тапсырыстар жоқ.",
    },
    citiesPanel: {
      empty: "Қалалар тізімі әзірге бос.",
      live: "Ашық",
      standby: "Күту",
      currency: "Валюта",
      timezone: "Уақыт белдеуі",
      country: "Ел",
    },
    tariffsPanel: {
      empty: "Белсенді тарифтер табылмады.",
      active: "белсенді",
      archived: "мұрағат",
      base: "База",
      perKm: "Км үшін",
      perMinute: "Минут үшін",
      minimum: "Минимум",
    },
    reportsPanel: {
      paymentFlow: "Төлем ағыны",
      captured: "Шегерілді",
      refunded: "Қайтарылды",
      paymentsCount: "Төлем саны",
      completedOrders: "Аяқталған тапсырыстар",
      serviceMix: "Қызмет құрылымы",
      statusHeat: "Күй картасы",
    },
    usersPanel: {
      empty: "Ағымдағы ағында клиенттер табылмады.",
    },
    executorsPanel: {
      empty: "Ағымдағы ағында орындаушылар табылмады.",
    },
    notesPanel: {
      eyebrow: "Ішкі ескертпелер",
      title: "Операторлық ескертпелер",
      description:
        "Backoffice-тен шықпай-ақ тапсырыс, клиент немесе орындаушы бойынша handoff, escalation және pin-маркерлері бар ішкі контекст.",
      createTitle: "Ескертпе қосу",
      createDescription:
        "Операциялық команда ішінде қалуы тиіс қысқа фактілер мен шешімдерді жазыңыз.",
      openFeedLabel: "Лентаны ашу",
      openQueueLabel: "Ашықтар",
      openEscalationsLabel: "Escalation",
      openActivityLabel: "Активтілікті ашу",
      kindLabel: "Ескертпе түрі",
      pinnedLabel: "Pin-маркер",
      stateLabel: "Күйі",
      assigneeLabel: "Жауапты",
      assigneePlaceholder: "Оператор немесе әкімші UUID",
      pinnedOn: "Жоғарыға бекіту",
      pinnedOff: "Қалыпты ескертпе",
      pinnedBadge: "Pinned",
      unassignedLabel: "Тағайындалмаған",
      resolvedAtLabel: "Шешілді",
      archivedAtLabel: "Мұрағатталды",
      updatedAtLabel: "Жаңартылды",
      bodyPlaceholder:
        "Мысалы: клиентке кері қоңырау керек, орындаушыны қайта тексеру қажет, тапсырыс қолмен бақылауда.",
      empty: "Бұл объект бойынша ішкі ескертпелер әзірге жоқ.",
      authorFallback: "Оператор",
    },
    forms: {
      apply: "Қолдану",
      clear: "Тазарту",
      create: "Құру",
      save: "Сақтау",
      addNote: "Ескертпе қосу",
      activate: "Қосу",
      deactivate: "Өшіру",
      archive: "Мұрағаттау",
      assign: "Тағайындау",
      retry: "Қайта іске қосу",
      cancel: "Тоқтату",
      refund: "Қайтарым жасау",
      block: "Блоктау",
      unblock: "Блоктан шығару",
      orderId: "Тапсырыс ID",
      executorId: "Орындаушы ID",
      userId: "Клиент ID",
      payment: "Төлем",
      amount: "Сома",
      address: "Мекенжай",
      refundAmount: "Қайтарым сомасы",
      reason: "Себеп",
      search: "Іздеу",
      period: "Кезең",
      dateFrom: "Басталу күні",
      dateTo: "Аяқталу күні",
      status: "Күй",
      blockedState: "Блок күйі",
      onlineState: "Онлайн күйі",
      verificationStatus: "Тексеру күйі",
      city: "Қала",
      limit: "Лимит",
      serviceType: "Сервис",
      activeState: "Күйі",
      allStates: "Барлығы",
      activeOnly: "Тек белсенді",
      inactiveOnly: "Тек белсенді емес",
      blockedOnly: "Тек блокталған",
      unblockedOnly: "Тек қолжетімді профильдер",
      onlineOnly: "Тек онлайн",
      offlineOnly: "Тек офлайн",
      activeBadge: "Белсенді",
      inactiveBadge: "Белсенді емес",
      onlineBadge: "Онлайн",
      offlineBadge: "Офлайн",
      blockedBadge: "Блокталған",
      unblockedBadge: "Қолжетімді",
      nameRu: "RU атауы",
      nameKk: "KK атауы",
      name: "Аты",
      phone: "Телефон",
      language: "Тіл",
      countryCode: "Ел коды",
      currency: "Валюта",
      bonusBalance: "Бонус балансы",
      timezone: "Уақыт белдеуі",
      isActive: "Белсенді",
      executorType: "Орындаушы түрі",
      vehicleType: "Көлік түрі",
      vehicleClass: "Класс / көлік",
      assignedCarClass: "Тағайындалған класс",
      vehicleMake: "Марка",
      vehicleModel: "Модель",
      vehicleYear: "Жылы",
      vehiclePlate: "Мемлекеттік нөмір",
      carClassEconomy: "Эконом",
      carClassComfort: "Комфорт",
      carClassComfortPlus: "Комфорт плюс",
      carClassBusiness: "Бизнес",
      rating: "Рейтинг",
      cancelRate: "Бас тарту үлесі",
      balance: "Баланс",
      client: "Клиент",
      executor: "Орындаушы",
      pickup: "Алып кету",
      destination: "Бару нүктесі",
      distance: "Қашықтық",
      duration: "Ұзақтығы",
      discountAmount: "Жеңілдік",
      acceptedAt: "Қабылданды",
      startedAt: "Басталды",
      completedAt: "Аяқталды",
      cancelledAt: "Тоқтатылды",
      cancelReason: "Тоқтату себебі",
      updatedAt: "Жаңартылды",
      clientRating: "Клиент бағасы",
      executorRating: "Орындаушы бағасы",
      contact: "Байланыс",
      notes: "Ескертпе",
      arrivedAt: "Келді",
      paymentStatus: "Төлем күйі",
      provider: "Провайдер",
      providerTransactionId: "Провайдер транзакциясы",
      refundedAmount: "Қайтарым",
      capturedAt: "Есептен шығарылды",
      packageDescription: "Сәлемдеме сипаттамасы",
      declaredValue: "Жарияланған құн",
      fragile: "Сынғыш жүк",
      requiresReturn: "Қайтару керек",
      cashOnDelivery: "Қолма-қол төлем",
      proofPhoto: "Растау фотосы",
      proofSignature: "Қолтаңба",
      recipientCode: "Алушы коды",
      packagePhoto: "Сәлемдеме фотосы",
      metadata: "Метадерек",
      actorId: "Инициатор ID",
      noteId: "Ескертпе ID",
      source: "Дереккөз",
      previousTariffId: "Алдыңғы тариф",
      createdAt: "Құрылған",
      basePrice: "Базалық баға",
      pricePerKm: "Км бағасы",
      pricePerMinute: "Минут бағасы",
      minimumPrice: "Ең төмен баға",
      freeWaitingSeconds: "Тегін күту (сек)",
      paidWaitingPerMinute: "Ақылы күту / мин",
      commissionPercent: "Комиссия, %",
      commissionFixed: "Тұрақты комиссия",
      validFrom: "Басталу күні",
      validTo: "Аяқталу күні",
      code: "Код",
      discountType: "Жеңілдік түрі",
      discountValue: "Жеңілдік мәні",
      maxUses: "Қолдану лимиті",
      percent: "Пайыз",
      fixed: "Тұрақты",
      noLimit: "Шектеусіз",
    },
    periods: {
      day: "күн",
      week: "апта",
      month: "ай",
    },
    warnings: {
      adminApiTokenMissing:
        "ADMIN_API_TOKEN берілмеген, сондықтан панель кірістірілген demo snapshot көрсетеді.",
      adminApiUrlInvalid:
        "ADMIN_API_URL қате берілген, сондықтан панель кірістірілген demo snapshot көрсетеді.",
      failedToLoad: (scope, detail) =>
        `${scope} жүктеу мүмкін болмады: ${detail}`,
      scopeCities: "қалаларды",
      scopeTariffs: "тарифтерді",
      scopeOrders: "тапсырыстарды",
      scopeFinancialReport: "қаржылық есепті",
      scopeOperationsReport: "операциялық есепті",
    },
    feedback: {
      cityCreated: "Қала құрылды.",
      cityUpdated: "Қала жаңартылды.",
      tariffCreated: "Тариф құрылды.",
      tariffUpdated: "Тариф жаңартылды.",
      promoCreated: "Промокод құрылды.",
      promoUpdated: "Промокод жаңартылды.",
      orderAssigned: "Тапсырыс орындаушыға тағайындалды.",
      dispatchRestarted: "Орындаушыны іздеу қайта іске қосылды.",
      orderStatusUpdated: "Тапсырыс күйі жаңартылды.",
      paymentCancelled: "Төлемдегі холд тоқтатылды.",
      paymentRefunded: "Төлем бойынша қайтарым жасалды.",
      userUpdated: "Клиент профилі жаңартылды.",
      executorVerified: "Орындаушының верификация күйі жаңартылды.",
      executorBlocked: "Орындаушының блок күйі жаңартылды.",
      executorBalanceTopUpUpdated: "Толықтыру өтінімі жаңартылды.",
      executorPayoutCreated: "Жүргізуші төлемі құрылды.",
      executorPayoutUpdated: "Жүргізуші төлемі жаңартылды.",
      dispatchSettingsUpdated: "Диспетчерлеу баптаулары жаңартылды.",
      driverBonusSettingsUpdated: "Жүргізуші бонустары жаңартылды.",
      noteCreated: "Ішкі ескертпе қосылды.",
      noteUpdated: "Ішкі ескертпе жаңартылды.",
      actionFailed: (detail) => `Әрекет орындалмады: ${detail}`,
    },
    enums: {
      serviceType: {
        taxi: "Такси",
        delivery: "Жеткізу",
        intercity: "Қалааралық",
        cargo: "Жүк",
        scooter: "Самокаттар",
      },
      orderStatus: {
        draft: "Черновик",
        searching: "Іздеу",
        accepted: "Қабылданды",
        arriving: "Жетіп келеді",
        waiting: "Күту",
        in_progress: "Орындауда",
        delivered: "Жеткізілді",
        completed: "Аяқталды",
        cancelled_client: "Клиент тоқтатты",
        cancelled_executor: "Орындаушы тоқтатты",
        cancelled_system: "Жүйе тоқтатты",
        failed: "Қате",
      },
      deliveryStatus: {
        pending_pickup: "Алып кетуді күтуде",
        picked_up: "Алып кетті",
        in_transit: "Жеткізілуде",
        at_door: "Есіктің алдында",
        delivered_confirmed: "Табыс етілді",
        delivery_failed: "Жеткізілмеді",
        returning: "Қайтарылуда",
      },
      paymentMethod: {
        card: "Карта",
        cash: "Қолма-қол",
        transfer_kaspi: "Kaspi аударымы",
        transfer_halyk: "Halyk аударымы",
        corporate: "Корпоративтік",
        bonus: "Бонустар",
      },
      paymentStatus: {
        pending: "Күтуде",
        authorized: "Холд",
        captured: "Есептен шығарылды",
        refunded: "Қайтарылды",
        partially_refunded: "Ішінара қайтарым",
        cancelled: "Тоқтатылды",
        failed: "Қате",
      },
      executorType: {
        driver: "Жүргізуші",
        courier: "Курьер",
        cargo_driver: "Жүк жүргізушісі",
      },
      vehicleType: {
        bicycle: "Велосипед",
        moped: "Мопед",
        scooter: "Самокат",
        car: "Авто",
      },
      verificationStatus: {
        pending: "Тексерілуде",
        verified: "Расталған",
        rejected: "Қабылданбаған",
      },
      adminNoteKind: {
        context: "Контекст",
        handoff: "Ауысым / handoff",
        escalation: "Эскалация",
      },
      adminNoteState: {
        open: "Ашық",
        resolved: "Шешілді",
        archived: "Мұрағатта",
      },
      adminActivityEntityType: {
        order: "Тапсырыс",
        user: "Клиент",
        executor: "Орындаушы",
        city: "Қала",
        tariff: "Тариф",
        promo_code: "Промокод",
        payment: "Төлем",
      },
      adminActivityAction: {
        "city.created": "Қаланы құру",
        "city.updated": "Қаланы жаңарту",
        "tariff.created": "Тарифті құру",
        "tariff.updated": "Тарифті жаңарту",
        "order.created": "Тапсырыс құру",
        "order.creation_requested": "Тапсырыс құру сұрауы",
        "order.assigned": "Тапсырысты қолмен тағайындау",
        "order.status_updated": "Тапсырыс күйін қолмен өзгерту",
        "order.dispatch_retried": "Диспетчті қайта іске қосу",
        "note.created": "Ішкі ескертпені құру",
        "note.updated": "Ішкі ескертпені жаңарту",
        "user.updated": "Клиентті жаңарту",
        "executor.updated": "Орындаушыны жаңарту",
        "executor.verified": "Орындаушы верификациясын өзгерту",
        "executor.blocked": "Орындаушы блок күйін өзгерту",
        "promo_code.created": "Промокодты құру",
        "promo_code.updated": "Промокодты жаңарту",
        "payment.refunded": "Төлемді қайтару",
        "payment.cancelled": "Төлем холдын тоқтату",
      },
    },
  },
};

function unwrapSearchParam(value: SearchParamValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function warningScopeLabel(scope: string, dictionary: AdminDictionary): string {
  switch (scope) {
    case "cities":
      return dictionary.warnings.scopeCities;
    case "tariffs":
      return dictionary.warnings.scopeTariffs;
    case "orders":
      return dictionary.warnings.scopeOrders;
    case "financial report":
      return dictionary.warnings.scopeFinancialReport;
    case "operations report":
      return dictionary.warnings.scopeOperationsReport;
    default:
      return scope;
  }
}

export function resolveAdminLocale(value: SearchParamValue): AdminLocale {
  const raw = unwrapSearchParam(value);
  return raw === "kk" || raw === "kz" ? "kk" : "ru";
}

export function getAdminDictionary(locale: AdminLocale): AdminDictionary {
  return dictionaries[locale];
}

export async function getAdminPageContext(searchParams?: AsyncSearchParams) {
  const resolved = searchParams ? await searchParams : undefined;
  const locale = resolveAdminLocale(resolved?.lang);

  return {
    locale,
    dictionary: getAdminDictionary(locale),
  };
}

export function getIntlLocale(locale: AdminLocale): string {
  return locale === "kk" ? "kk-KZ" : "ru-RU";
}

export function buildLocalizedHref(path: string, locale: AdminLocale): string {
  const normalizedPath = path || "/";
  return `${normalizedPath}?lang=${locale}`;
}

export function localizeWarning(
  warning: string,
  dictionary: AdminDictionary,
): string {
  if (warning === "ADMIN_API_TOKEN_MISSING") {
    return dictionary.warnings.adminApiTokenMissing;
  }

  if (warning === "ADMIN_API_URL_INVALID") {
    return dictionary.warnings.adminApiUrlInvalid;
  }

  const matched = warning.match(/^Failed to load (.+?): (.+)$/);
  if (!matched) {
    return warning;
  }

  const [, scope, detail] = matched;
  return dictionary.warnings.failedToLoad(
    warningScopeLabel(scope, dictionary),
    detail,
  );
}

export function translateServiceType(
  value: ServiceType,
  dictionary: AdminDictionary,
): string {
  return dictionary.enums.serviceType[value];
}

export function translateOrderStatus(
  value: OrderStatus,
  dictionary: AdminDictionary,
): string {
  return dictionary.enums.orderStatus[value];
}

export function translateDeliveryStatus(
  value: DeliveryStatus,
  dictionary: AdminDictionary,
): string {
  return dictionary.enums.deliveryStatus[value];
}

export function translatePaymentMethod(
  value: PaymentMethod,
  dictionary: AdminDictionary,
): string {
  return dictionary.enums.paymentMethod[value];
}

export function translatePaymentStatus(
  value: PaymentStatus,
  dictionary: AdminDictionary,
): string {
  return dictionary.enums.paymentStatus[value];
}

export function translateExecutorType(
  value: ExecutorTypeValue,
  dictionary: AdminDictionary,
): string {
  return dictionary.enums.executorType[value];
}

export function translateVehicleType(
  value: VehicleTypeValue,
  dictionary: AdminDictionary,
): string {
  return dictionary.enums.vehicleType[value];
}

export function translateVerificationStatus(
  value: VerificationStatusValue,
  dictionary: AdminDictionary,
): string {
  return dictionary.enums.verificationStatus[value];
}

export function localizeAdminNoteKind(
  value: "context" | "handoff" | "escalation",
  dictionary: AdminDictionary,
): string {
  return dictionary.enums.adminNoteKind[value];
}

export function localizeAdminNoteState(
  value: "open" | "resolved" | "archived",
  dictionary: AdminDictionary,
): string {
  return dictionary.enums.adminNoteState[value];
}

export function localizeAdminActivityEntityType(
  value: AdminActivityEntityType,
  dictionary: AdminDictionary,
): string {
  return dictionary.enums.adminActivityEntityType[value];
}

export function localizeAdminActivityAction(
  value: AdminActivityAction,
  dictionary: AdminDictionary,
): string {
  return dictionary.enums.adminActivityAction[value];
}

export function translatePeriod(
  value: string,
  dictionary: AdminDictionary,
): string {
  if (value === "day" || value === "week" || value === "month") {
    return dictionary.periods[value];
  }

  return value;
}
