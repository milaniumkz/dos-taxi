# AGENTS.md — Мультисервисная платформа перевозок и доставки

> Этот файл является основным контекстом для Codex / AI-агентов.
> Читай его **полностью** перед тем как писать или изменять код.
> Все решения, конвенции и приоритеты зафиксированы здесь.

---

## 1. О ПРОЕКТЕ

Мобильная платформа, объединяющая городское такси, межгород, грузоперевозки, курьерскую доставку и аренду самокатов.

| Параметр | Значение |
|---|---|
| Этап 1 (MVP) | Такси + Доставка (велосипед, авто, мопед, самокат) |
| Этап 2 | Межгород, Грузы, Аренда самокатов |
| Backend | Node.js + NestJS |
| Mobile | Flutter (iOS + Android) |
| Admin panel | React / Next.js |
| Database | PostgreSQL + Redis |
| Maps | OpenStreetMap (OSM) |
| Languages | Русский (ru), Казахский (kz) |
| Currencies | RUB, KZT |

---

## 2. СТРУКТУРА МОНОРЕПОЗИТОРИЯ

```
/
├── apps/
│   ├── api/                        # NestJS backend
│   ├── mobile/                     # Flutter (client + driver/courier)
│   └── admin/                      # React/Next.js backoffice
├── packages/
│   ├── shared-types/               # TypeScript типы и DTO, используемые в api + admin
│   └── config/                     # Общие конфиги (ESLint, Prettier, tsconfig base)
├── infra/
│   ├── docker-compose.yml          # dev-окружение: postgres, redis, minio, rabbitmq
│   ├── docker-compose.test.yml     # тестовое окружение
│   └── nginx/                      # reverse proxy конфиг
├── docs/
│   ├── api/                        # OpenAPI YAML/JSON
│   ├── erd/                        # ERD диаграммы
│   └── decisions/                  # ADR (Architecture Decision Records)
├── AGENTS.md                       # ← этот файл
├── .env.example
└── README.md
```

### 2.1 Структура NestJS backend (`apps/api/`)

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── modules/
│   │   ├── auth/                   # Регистрация, OTP, JWT, refresh tokens
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── strategies/         # JWT strategy, OTP strategy
│   │   │   ├── guards/
│   │   │   ├── dto/
│   │   │   └── auth.spec.ts
│   │   ├── users/                  # Профили клиентов
│   │   ├── executors/              # Водители и курьеры
│   │   ├── orders/                 # Жизненный цикл заказов
│   │   │   ├── orders.controller.ts
│   │   │   ├── orders.service.ts
│   │   │   ├── orders.module.ts
│   │   │   ├── entities/
│   │   │   ├── dto/
│   │   │   ├── enums/
│   │   │   └── orders.spec.ts
│   │   ├── dispatch/               # Matching engine — подбор исполнителей
│   │   ├── pricing/                # Тарифный движок
│   │   ├── payments/               # Платежный абстрактный слой
│   │   ├── geo/                    # Геокодинг, маршруты, зоны (OSM)
│   │   ├── delivery/               # Расширенная логика доставки
│   │   ├── notifications/          # Push, SMS, email
│   │   ├── admin/                  # Admin API endpoints
│   │   ├── reports/                # Аналитика и отчёты
│   │   └── common/                 # Фильтры, декораторы, утилиты, guards
│   ├── database/
│   │   ├── migrations/             # TypeORM или Knex миграции (версионируемые)
│   │   ├── seeds/                  # Сиды для dev/staging
│   │   └── database.module.ts
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   └── jwt.config.ts
│   └── shared/
│       ├── interceptors/
│       ├── filters/                # GlobalExceptionFilter
│       ├── pipes/
│       └── decorators/
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
└── tsconfig.json
```

### 2.2 Структура Flutter (`apps/mobile/`)

```
apps/mobile/
├── lib/
│   ├── main.dart
│   ├── app/
│   │   ├── app.dart
│   │   └── router/                 # GoRouter конфиг
│   ├── core/
│   │   ├── api/                    # Dio client, interceptors, refresh token
│   │   ├── config/                 # Env, flavors (dev/staging/prod)
│   │   ├── l10n/                   # ARB файлы: app_ru.arb, app_kk.arb
│   │   ├── theme/
│   │   └── utils/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── data/               # Repository impl, API datasource
│   │   │   ├── domain/             # Use cases, entities, repo interface
│   │   │   └── presentation/       # Bloc + screens + widgets
│   │   ├── home/
│   │   ├── taxi/
│   │   │   ├── data/
│   │   │   ├── domain/
│   │   │   └── presentation/
│   │   ├── delivery/
│   │   │   ├── data/
│   │   │   ├── domain/
│   │   │   └── presentation/
│   │   ├── active_order/           # Трекинг активного заказа (такси и доставка)
│   │   ├── order_history/
│   │   ├── profile/
│   │   ├── payments/
│   │   └── support/
│   └── shared/
│       ├── widgets/
│       ├── map/                    # OSM map widget, markers, polylines
│       └── models/
├── assets/
│   ├── icons/
│   └── images/
├── flavors/
│   ├── dev/
│   ├── staging/
│   └── prod/
└── pubspec.yaml
```

---

## 3. ТЕХНОЛОГИЧЕСКИЙ СТЕК — ОБЯЗАТЕЛЬНЫЕ РЕШЕНИЯ

### Backend
| Технология | Версия / Решение | Примечание |
|---|---|---|
| Runtime | Node.js 20 LTS | |
| Framework | NestJS 10+ | Модульная архитектура, DI, Guards |
| ORM | TypeORM | Миграции обязательны для каждого изменения схемы |
| Database | PostgreSQL 15+ | Основное хранилище |
| Cache / Queue | Redis 7+ | Сессии, rate limit, BullMQ очереди |
| Realtime | Socket.IO | Трекинг позиций и статусов заказов |
| Validation | class-validator + class-transformer | На всех DTO |
| Auth | JWT (access 15m + refresh 30d) | Хранение refresh в httpOnly cookie или secure storage |
| Docs | @nestjs/swagger | OpenAPI автогенерация, обязательный артефакт |
| Tests | Jest + Supertest | unit + integration + e2e |

### Flutter
| Технология | Решение |
|---|---|
| State management | **Bloc / Cubit** (принято как стандарт проекта) |
| Navigation | GoRouter |
| HTTP | Dio + dio_cache_interceptor |
| Maps | flutter_map (OSM-совместим) |
| Localization | flutter_localizations + intl (ARB файлы) |
| Push | firebase_messaging + flutter_local_notifications |
| Secure storage | flutter_secure_storage |
| DI | get_it + injectable |
| Tests | flutter_test + bloc_test + mocktail |

---

## 4. СОГЛАШЕНИЯ ПО КОДУ

### 4.1 Общие правила
- **Язык кода:** английский (имена классов, методов, переменных, комментарии в коде).
- **Язык коммитов:** русский или английский, формат Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`.
- Никакого хардкода строк UI — только через локализацию (ARB для Flutter, i18n для admin).
- Никакого хардкода секретов — только через переменные окружения `.env`.
- Каждый модуль NestJS — самодостаточный: controller, service, module, dto/, entities/, spec.
- Каждый feature Flutter — по Clean Architecture: data / domain / presentation.

### 4.2 NestJS-специфичные правила
```typescript
// ✅ Правильно — DTO с валидацией
export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  serviceType: ServiceType;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  routePoints: RoutePointDto[];
}

// ✅ Правильно — единый формат ошибки
throw new BadRequestException({
  code: 'ORDER_ROUTE_INVALID',
  message: 'Route must have at least 2 points',
  traceId: req.traceId,
});

// ❌ Запрещено — нет валидации, нет типов
app.post('/order', (req, res) => { ... })
```

- Все endpoint'ы должны иметь `@ApiOperation`, `@ApiResponse` декораторы.
- Все чувствительные операции — идемпотентны (принимают `X-Idempotency-Key`).
- Rate limiting через `@nestjs/throttler` на auth-эндпоинтах.

### 4.3 Flutter-специфичные правила
```dart
// ✅ Правильно — Cubit с состоянием
class TaxiOrderCubit extends Cubit<TaxiOrderState> {
  TaxiOrderCubit(this._createOrderUseCase) : super(TaxiOrderInitial());
  final CreateOrderUseCase _createOrderUseCase;

  Future<void> createOrder(CreateOrderParams params) async {
    emit(TaxiOrderLoading());
    final result = await _createOrderUseCase(params);
    result.fold(
      (failure) => emit(TaxiOrderError(failure.message)),
      (order) => emit(TaxiOrderSuccess(order)),
    );
  }
}

// ❌ Запрещено — setState в сложной бизнес-логике
```

- Все тексты через `AppLocalizations.of(context)` — никаких строк напрямую.
- Использовать `Either<Failure, T>` из `dartz` для обработки ошибок в domain слое.
- Виджеты разбиваются: если `build()` > 60 строк — выносить в отдельный виджет.

### 4.4 Форматирование
- Backend: ESLint + Prettier (конфиг в `packages/config/`)
- Flutter: `dart format` + `flutter analyze` без ошибок перед коммитом
- Pre-commit hooks через Husky (backend) и lefthook (Flutter)

---

## 5. МОДЕЛЬ ДАННЫХ — КЛЮЧЕВЫЕ СУЩНОСТИ

### Перечисления (enums)

```typescript
// ServiceType — тип сервиса
enum ServiceType {
  TAXI = 'taxi',
  DELIVERY = 'delivery',
  INTERCITY = 'intercity',   // этап 2
  CARGO = 'cargo',           // этап 2
  SCOOTER = 'scooter',       // этап 2
}

// ExecutorType — тип исполнителя
enum ExecutorType {
  DRIVER = 'driver',
  COURIER = 'courier',
  CARGO_DRIVER = 'cargo_driver',   // этап 2
}

// CourierVehicleType — тип транспорта курьера (этап 1)
enum CourierVehicleType {
  BICYCLE = 'bicycle',
  MOPED = 'moped',
  SCOOTER = 'scooter',
  CAR = 'car',
}

// OrderStatus — статусы заказа
enum OrderStatus {
  DRAFT = 'draft',
  SEARCHING = 'searching',         // идёт поиск исполнителя
  ACCEPTED = 'accepted',           // исполнитель принял
  ARRIVING = 'arriving',           // едет к точке подачи
  WAITING = 'waiting',             // ждёт клиента/курьер на месте
  IN_PROGRESS = 'in_progress',     // поездка/доставка в процессе
  DELIVERED = 'delivered',         // доставлено (только для доставки)
  COMPLETED = 'completed',         // заказ завершён
  CANCELLED_CLIENT = 'cancelled_client',
  CANCELLED_EXECUTOR = 'cancelled_executor',
  CANCELLED_SYSTEM = 'cancelled_system',
  FAILED = 'failed',
}

// DeliveryStatus — расширенные статусы доставки
enum DeliveryStatus {
  PENDING_PICKUP = 'pending_pickup',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  AT_DOOR = 'at_door',
  DELIVERED_CONFIRMED = 'delivered_confirmed',
  DELIVERY_FAILED = 'delivery_failed',
  RETURNING = 'returning',
}

// PaymentMethod
enum PaymentMethod {
  CARD = 'card',
  CASH = 'cash',
  CORPORATE = 'corporate',
  BONUS = 'bonus',
}

// PaymentStatus
enum PaymentStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',    // hold
  CAPTURED = 'captured',        // списано
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

// Currency
enum Currency {
  RUB = 'RUB',
  KZT = 'KZT',
}

// UserRole
enum UserRole {
  CLIENT = 'client',
  EXECUTOR = 'executor',
  OPERATOR = 'operator',
  ADMIN = 'admin',
  SUPPORT = 'support',
  FINANCE = 'finance',
}
```

### Ключевые таблицы PostgreSQL

```sql
-- Пользователи (клиенты)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100),
  email VARCHAR(255),
  preferred_language VARCHAR(5) DEFAULT 'ru',   -- 'ru' | 'kk'
  preferred_currency VARCHAR(3) DEFAULT 'KZT',
  bonus_balance DECIMAL(12,2) DEFAULT 0,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Исполнители (водители + курьеры)
CREATE TABLE executors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  executor_type executor_type_enum NOT NULL,
  vehicle_type courier_vehicle_type_enum,    -- NULL для такси-водителей
  car_class VARCHAR(50),                     -- economy, comfort, business
  is_online BOOLEAN DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 5.00,
  cancel_rate DECIMAL(5,2) DEFAULT 0,
  balance DECIMAL(12,2) DEFAULT 0,
  city_id UUID REFERENCES cities(id),
  verification_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Позиции исполнителей (обновляется через Redis, пишется в PG реже)
CREATE TABLE executor_locations (
  executor_id UUID REFERENCES executors(id),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  heading SMALLINT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (executor_id)
);

-- Заказы
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES users(id) NOT NULL,
  executor_id UUID REFERENCES executors(id),
  service_type service_type_enum NOT NULL,
  status order_status_enum NOT NULL DEFAULT 'draft',
  city_id UUID REFERENCES cities(id) NOT NULL,
  currency currency_enum NOT NULL,
  estimated_price DECIMAL(12,2),
  final_price DECIMAL(12,2),
  distance_meters INT,
  duration_seconds INT,
  payment_method payment_method_enum NOT NULL,
  promo_code_id UUID REFERENCES promo_codes(id),
  discount_amount DECIMAL(12,2) DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  client_rating SMALLINT CHECK (client_rating BETWEEN 1 AND 5),
  executor_rating SMALLINT CHECK (executor_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Точки маршрута
CREATE TABLE route_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  sequence_index SMALLINT NOT NULL,           -- 0 = подача, 1+ = промежуточные/назначение
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT NOT NULL,
  contact_name VARCHAR(100),
  contact_phone VARCHAR(20),
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- Детали доставки (дополнение к orders для service_type = 'delivery')
CREATE TABLE delivery_details (
  order_id UUID PRIMARY KEY REFERENCES orders(id),
  courier_vehicle_type courier_vehicle_type_enum NOT NULL,
  package_description TEXT,
  package_photo_url TEXT,
  declared_value DECIMAL(12,2),
  is_fragile BOOLEAN DEFAULT false,
  requires_return BOOLEAN DEFAULT false,
  cash_on_delivery DECIMAL(12,2),
  delivery_status delivery_status_enum DEFAULT 'pending_pickup',
  proof_photo_url TEXT,
  proof_signature_url TEXT,
  recipient_code VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Платежи
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  status payment_status_enum NOT NULL DEFAULT 'pending',
  method payment_method_enum NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency currency_enum NOT NULL,
  exchange_rate DECIMAL(12,6),                -- курс на момент создания
  amount_base DECIMAL(12,2),                  -- сумма в базовой валюте города
  provider VARCHAR(50),                       -- 'cloudpayments', 'kaspi', etc.
  provider_transaction_id VARCHAR(255),
  idempotency_key VARCHAR(255) UNIQUE,
  captured_at TIMESTAMPTZ,
  refunded_amount DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Города
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ru VARCHAR(100) NOT NULL,
  name_kk VARCHAR(100) NOT NULL,
  country_code VARCHAR(3) NOT NULL,           -- 'RU' | 'KZ'
  currency currency_enum NOT NULL,
  timezone VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT false,
  service_zone JSONB,                         -- GeoJSON polygon зоны обслуживания
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Тарифы (версионируемые)
CREATE TABLE tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES cities(id),
  service_type service_type_enum NOT NULL,
  vehicle_class VARCHAR(50),
  name_ru VARCHAR(100) NOT NULL,
  name_kk VARCHAR(100) NOT NULL,
  base_price DECIMAL(12,2) NOT NULL,
  price_per_km DECIMAL(12,4) NOT NULL,
  price_per_minute DECIMAL(12,4) NOT NULL,
  minimum_price DECIMAL(12,2) NOT NULL,
  free_waiting_seconds INT DEFAULT 180,
  paid_waiting_per_minute DECIMAL(12,4) DEFAULT 0,
  currency currency_enum NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. API КОНТРАКТ — ОСНОВНЫЕ ЭНДПОИНТЫ

Все API: `/api/v1/...`
Authorization: `Bearer <access_token>`
Формат ошибки:
```json
{
  "code": "ORDER_NOT_FOUND",
  "message": "Order not found",
  "details": {},
  "traceId": "abc-123"
}
```

### Auth
```
POST   /api/v1/auth/send-otp          { phone: string }
POST   /api/v1/auth/verify-otp        { phone, code, role: 'client'|'executor' }
POST   /api/v1/auth/refresh            { refreshToken: string }
POST   /api/v1/auth/logout
```

### Orders (Client)
```
POST   /api/v1/orders/estimate         Расчёт стоимости без создания заказа
POST   /api/v1/orders                  Создать заказ
GET    /api/v1/orders/:id              Детали заказа
PATCH  /api/v1/orders/:id/cancel       Отменить заказ
GET    /api/v1/orders/history          История заказов (пагинация)
POST   /api/v1/orders/:id/rate         Оценить заказ
```

### Orders (Executor)
```
GET    /api/v1/executor/orders/incoming   Входящие офферы
POST   /api/v1/executor/orders/:id/accept
POST   /api/v1/executor/orders/:id/reject
PATCH  /api/v1/executor/orders/:id/status  { status, coords?, photo? }
GET    /api/v1/executor/orders/active
GET    /api/v1/executor/orders/history
```

### Delivery-специфичные
```
PATCH  /api/v1/executor/orders/:id/delivery/pickup      Забрал посылку
PATCH  /api/v1/executor/orders/:id/delivery/at-door     У двери
PATCH  /api/v1/executor/orders/:id/delivery/complete    Вручено + { proofPhoto, recipientCode }
PATCH  /api/v1/executor/orders/:id/delivery/failed      Не вручено + { reason }
```

### Geo
```
GET    /api/v1/geo/autocomplete?q=...&cityId=...   Поиск адреса
GET    /api/v1/geo/reverse?lat=...&lng=...          Обратный геокодинг
POST   /api/v1/geo/route                            { from, to, waypoints[] }
GET    /api/v1/geo/executors-nearby?lat&lng&type    Ближайшие исполнители (обобщённо)
```

### Payments
```
GET    /api/v1/payments/methods                     Сохранённые карты
POST   /api/v1/payments/cards/bind                  Привязать карту
DELETE /api/v1/payments/cards/:id
POST   /api/v1/payments/orders/:id/pay              Оплатить заказ картой
POST   /api/v1/payments/webhook/:provider           Webhook от провайдера
```

### Executor Profile
```
GET    /api/v1/executor/profile
PATCH  /api/v1/executor/profile
PATCH  /api/v1/executor/status           { isOnline: bool, lat, lng }
POST   /api/v1/executor/location         { lat, lng, heading }
GET    /api/v1/executor/balance
GET    /api/v1/executor/earnings
```

### Admin
```
GET/POST/PATCH  /api/v1/admin/cities
GET/POST/PATCH  /api/v1/admin/tariffs
GET             /api/v1/admin/orders            Список с фильтрами
PATCH           /api/v1/admin/orders/:id/assign  { executorId }
GET/PATCH       /api/v1/admin/users/:id
GET/PATCH       /api/v1/admin/executors/:id
POST            /api/v1/admin/executors/:id/verify
POST            /api/v1/admin/executors/:id/block
GET/POST/PATCH  /api/v1/admin/promo-codes
GET             /api/v1/admin/reports/financial
GET             /api/v1/admin/reports/operations
```

### WebSocket events
```
# Client подписывается на:
order:status_changed     { orderId, status, executor? }
order:executor_location  { orderId, lat, lng, heading }
order:message            { orderId, text, from }
order:eta_updated        { orderId, etaSeconds }

# Executor подписывается на:
executor:incoming_order  { orderId, offer }
executor:order_cancelled { orderId, reason }
```

---

## 7. БИЗНЕС-ЛОГИКА — КРИТИЧЕСКИЕ ПРАВИЛА

### 7.1 Расчёт стоимости (Pricing Service)
```typescript
// Формула такси:
price = max(
  tariff.minimumPrice,
  tariff.basePrice
  + (distanceKm * tariff.pricePerKm)
  + (durationMinutes * tariff.pricePerMinute)
) * surgeCoefficient * nightCoefficient;

// Для доставки добавляется:
price += vehicleTypeSurcharge[courierVehicleType];
price += urgencySurcharge; // если срочная
price += returnDeliveryCost; // если нужна обратная

// Коэффициенты:
// surgeCoefficient — из demand_zones Redis, пересчитывается каждые 2 мин
// nightCoefficient — настраивается в тарифе по часам
// Все коэффициенты хранить с историей изменений
```

### 7.2 Matching Engine (Dispatch Service)
1. Получить список онлайн-исполнителей в радиусе `city.maxDispatchRadiusKm` (по умолчанию 5 км).
2. Фильтровать по: `serviceType`, `vehicleType` (для доставки), `verificationStatus = verified`, `isBlocked = false`.
3. Ранжировать по: расстояние (70%) + рейтинг (20%) + cancel_rate обратно (10%).
4. Отправить оффер первому. Таймаут ответа: **20 секунд** (настраивается в конфиге).
5. Если отклонил или таймаут — следующий из очереди. До 5 попыток.
6. Если никто не принял — статус `SEARCHING`, повторный запуск через 30 сек.
7. Все офферы логировать в таблицу `dispatch_offers` для аналитики.

### 7.3 Мультивалютность
```typescript
// ПРАВИЛО: курс фиксируется в момент создания заказа
const rate = await currencyService.getRate(Currency.RUB, Currency.KZT);
// Сохранять в payment: amount, currency, exchange_rate, amount_base
// После фиксации — НЕ пересчитывать
// Источник курса — ЦБ РФ + НБ РК, кэш в Redis на 1 час
```

### 7.4 Статусная машина заказа
```
draft → searching → accepted → arriving → waiting → in_progress → completed
                ↘ cancelled_*                      ↘ failed
```
- Переходы только через `OrdersService.transition(orderId, newStatus, actorId)`.
- Каждый переход записывать в `order_status_events`.
- Запрещённые переходы бросают `BadRequestException` с кодом `INVALID_STATUS_TRANSITION`.

---

## 8. ЗАДАЧИ ДЛЯ CODEX — ЭТАП 1 MVP

Задачи пронумерованы. Выполнять **строго по порядку** в рамках каждого блока. Блоки A и B можно вести параллельно.

---

### БЛОК A: BACKEND CORE (NestJS)

#### A-01 · Инициализация репозитория
```
Создай монорепозиторий со структурой из секции 2.
Настрой:
- pnpm workspaces
- tsconfig.base.json с strict: true
- ESLint + Prettier конфиг в packages/config/
- Husky pre-commit: lint + typecheck
- docker-compose.yml: postgres:15, redis:7, minio, rabbitmq
- .env.example со всеми переменными (без значений)
- apps/api/ с NestJS через nest new
```

#### A-02 · Database и миграции
```
В apps/api настрой TypeORM:
- Подключение к PostgreSQL через DATABASE_URL
- Создай все миграции из секции 5 (таблицы: users, executors,
  executor_locations, orders, route_points, delivery_details,
  payments, cities, tariffs)
- Создай все enum типы PostgreSQL
- Добавь индексы: orders(client_id), orders(executor_id),
  orders(status), orders(city_id), orders(created_at),
  executor_locations(executor_id)
- Создай seed для dev: 1 город (Алматы, KZT), базовые тарифы
  для taxi/economy и delivery/bicycle,car,moped,scooter
```

#### A-03 · Auth модуль
```
Реализуй apps/api/src/modules/auth/:
- POST /api/v1/auth/send-otp: генерация 4-значного кода,
  хранение в Redis с TTL 5 мин, лимит 3 попытки/час с IP
- POST /api/v1/auth/verify-otp: проверка, создание user если
  не существует, выдача JWT access (15m) + refresh (30d)
- POST /api/v1/auth/refresh: ротация refresh токена
- POST /api/v1/auth/logout: инвалидация refresh токена
- JwtAuthGuard, RolesGuard, CurrentUser декоратор
- В dev-режиме код всегда 1234 (управляется feature flag)
- Тест: unit на OTP логику, integration на /send-otp и /verify-otp
```

#### A-04 · Users и Executors модули
```
Реализуй CRUD профилей:
- GET/PATCH /api/v1/profile (клиент)
- GET/PATCH /api/v1/executor/profile
- PATCH /api/v1/executor/status { isOnline, lat, lng }
  → обновляет Redis key executor:location:{id} с TTL 5 мин
  → пишет в executor_locations
- Загрузка документов: POST /api/v1/executor/documents
  → сохранять в MinIO/S3, URL в БД
- Верификация через admin: PATCH /api/v1/admin/executors/:id/verify
- Тест: unit на сервисы, integration на endpoints
```

#### A-05 · Geo сервис
```
Реализуй apps/api/src/modules/geo/:
- Адаптер для Nominatim (OSM): geocode, reverse geocode, autocomplete
- Адаптер для OSRM: route (polyline, distance, duration)
- GET /api/v1/geo/autocomplete?q=&cityId=
- GET /api/v1/geo/reverse?lat=&lng=
- POST /api/v1/geo/route { from:{lat,lng}, to:{lat,lng}, waypoints? }
  → возвращает { polyline, distanceMeters, durationSeconds }
- GET /api/v1/geo/executors-nearby?lat&lng&serviceType&vehicleType
  → из Redis (executor:location:*), только онлайн, обобщённые маркеры
- Кэш geocode результатов в Redis на 24 часа
- Тест: unit с mock адаптеров
```

#### A-06 · Pricing сервис
```
Реализуй apps/api/src/modules/pricing/:
- PricingService.estimate(cityId, serviceType, vehicleType?,
  distanceMeters, durationSeconds) → EstimateResult
- Загрузка актуального тарифа из БД (кэш Redis 5 мин)
- Применение surgeCoefficient из Redis demand_zones
- Формула из секции 7.1
- Для delivery: surcharge по CourierVehicleType из тарифа
- POST /api/v1/orders/estimate (публичный после auth)
- CurrencyService: getRate(from, to) с кэшем Redis 1 час
- Тест: unit на формулу для каждого сценария такси/доставки
```

#### A-07 · Orders модуль — такси
```
Реализуй создание и жизненный цикл заказа такси:
- POST /api/v1/orders { serviceType:'taxi', routePoints[], paymentMethod,
  carClass, promoCode?, scheduledAt? }
- Валидация города, зоны обслуживания, тарифа
- Расчёт через PricingService
- Статусная машина из секции 7.4, метод transition()
- Таблица order_status_events
- GET /api/v1/orders/:id
- PATCH /api/v1/orders/:id/cancel
- GET /api/v1/orders/history (пагинация cursor-based)
- POST /api/v1/orders/:id/rate { executorRating, comment }
- Socket.IO: emit order:status_changed при каждом переходе
- Тест: unit на transition(), integration на полный flow
```

#### A-08 · Dispatch сервис
```
Реализуй apps/api/src/modules/dispatch/:
- DispatchService.findAndAssign(orderId) — алгоритм из секции 7.2
- Таблица dispatch_offers { id, order_id, executor_id, offered_at,
  responded_at, response: 'accepted'|'rejected'|'timeout' }
- BullMQ очередь dispatch-queue: задача на каждый новый заказ
- Таймаут оффера 20 сек (через BullMQ delayed job)
- POST /api/v1/executor/orders/:id/accept
- POST /api/v1/executor/orders/:id/reject
- Socket.IO: emit executor:incoming_order исполнителю
- Повторный поиск если все отклонили
- Тест: unit на алгоритм ранжирования
```

#### A-09 · Orders модуль — доставка
```
Расширь Orders для service_type = 'delivery':
- POST /api/v1/orders с доп. полями:
  { ...baseOrder, serviceType:'delivery', courierVehicleType,
    packageDescription, packagePhoto?, declaredValue?,
    isFragile, requiresReturn, cashOnDelivery?, recipientCode? }
- Создание записи delivery_details при создании заказа
- Эндпоинты статусов курьера из секции 6 API:
  pickup / at-door / complete (proofPhoto, recipientCode) / failed
- Уведомление клиента и получателя (SMS + Push) на каждый статус
- Тест: integration на полный flow доставки по каждому типу курьера
```

#### A-10 · Payments модуль
```
Реализуй абстрактный payment gateway layer:
- Интерфейс IPaymentProvider:
  createPayment, confirmPayment, cancelPayment, refundPayment,
  bindCard, getPaymentStatus, createPayout, handleWebhook
- Stub-провайдер для dev (всегда success, задержка 500ms)
- POST /api/v1/payments/orders/:id/pay { cardId, idempotencyKey }
- POST /api/v1/payments/webhook/:provider → идемпотентная обработка
- При capture → update payment status → trigger order completion
- GET /api/v1/payments/methods, POST/DELETE cards
- Тест: unit на идемпотентность webhook обработки
```

#### A-11 · Notifications модуль
```
Реализуй apps/api/src/modules/notifications/:
- NotificationsService.send(userId, type, payload, lang)
- Каналы: Push (Firebase FCM), SMS (stub + реальный провайдер)
- Шаблоны уведомлений в БД (таблица notification_templates):
  { type, channel, lang:'ru'|'kk', subject, body с placeholders }
- BullMQ очередь notifications-queue
- Сохранение device tokens при авторизации
- Типы: order_accepted, order_arriving, order_started,
  order_completed, order_cancelled, delivery_picked_up,
  delivery_at_door, delivery_completed, delivery_failed
- Тест: unit на template rendering
```

#### A-12 · Admin API + Backoffice API
```
Реализуй admin-защищённые эндпоинты (roles: admin, operator, support):
- CRUD города и активация
- CRUD тарифов с версионированием (valid_from, valid_to)
- GET /api/v1/admin/orders?status=&cityId=&dateFrom=&dateTo= (пагинация)
- PATCH /api/v1/admin/orders/:id/assign { executorId } — ручное назначение
- GET/PATCH /api/v1/admin/users/:id (просмотр, блокировка)
- GET/PATCH /api/v1/admin/executors/:id + verify/block
- CRUD promo-codes { code, discountType, discountValue, maxUses, validTo }
- GET /api/v1/admin/reports/financial?period=
- GET /api/v1/admin/reports/operations?cityId=&period=
- Тест: integration на роли (admin vs support — разные права)
```

#### A-13 · Тесты и OpenAPI
```
Финализируй тестовое покрытие:
- Unit тесты: PricingService, DispatchService, OrdersService.transition,
  AuthService OTP логика, CurrencyService, NotificationsService
- Integration тесты: все auth эндпоинты, полный flow заказа такси,
  полный flow доставки (все 4 типа курьера), payments webhook
- E2E тест (Supertest): регистрация → создание заказа такси →
  принятие водителем → завершение → оценка
- @nestjs/swagger: все контроллеры задокументированы
- Экспорт apps/api/docs/openapi.json в CI
- Целевое покрытие: >80% строк на бизнес-логике (modules/)
```

---

### БЛОК B: FLUTTER MOBILE

#### B-01 · Инициализация Flutter проекта
```
Создай apps/mobile/ Flutter проект:
- Настрой flavors: dev, staging, prod (каждый с отдельным main_*.dart)
- pubspec.yaml с зависимостями:
  flutter_bloc, go_router, dio, flutter_map, flutter_secure_storage,
  get_it, injectable, intl, firebase_messaging, dartz, equatable,
  freezed, json_annotation, mocktail, bloc_test
- Структура папок из секции 2.2
- l10n: создай app_ru.arb и app_kk.arb с ключами для всех экранов
- Базовый ThemeData (light): цвета, типографика, отступы как константы
- Dio client с BaseOptions(baseUrl), AuthInterceptor (добавляет Bearer),
  RefreshTokenInterceptor (обновляет по 401), RetryInterceptor (3 попытки)
- GlobalExceptionHandler — преобразует DioException в Failure
```

#### B-02 · Auth feature (Flutter)
```
Реализуй features/auth/ по Clean Architecture:
Domain:
- Entity: User { id, phone, name, preferredLanguage, preferredCurrency }
- UseCase: SendOtpUseCase, VerifyOtpUseCase
- Repository interface: IAuthRepository

Data:
- AuthRemoteDataSource (Dio)
- AuthLocalDataSource (flutter_secure_storage: токены)
- AuthRepositoryImpl

Presentation:
- SplashScreen: проверяет токен → роутинг
- PhoneInputScreen: ввод номера, кнопка "Получить код"
- OtpScreen: 4-значный ввод + таймер повтора 60 сек
- AuthCubit { idle, loading, otpSent, authenticated, error }

Тест: bloc_test на AuthCubit, unit на UseCases с mock repository
```

#### B-03 · Главный экран + карта (Flutter)
```
Реализуй features/home/:
- HomeScreen: карта flutter_map (OSM тайлы), переключатель сервиса
  (Такси / Доставка), кнопка "Заказать", FAB "Моя позиция"
- MapWidget: отображение тайлов OSM, текущая позиция пользователя,
  маркеры ближайших исполнителей (обобщённо, из /geo/executors-nearby)
- ServiceSwitcher: Такси | Доставка (два активных в MVP)
- AddressSearchBar: поиск через /geo/autocomplete, debounce 300ms
- HomeCubit: управляет состоянием карты и сервиса
- Тест: unit на логику AddressSearch debounce
```

#### B-04 · Заказ такси — экраны (Flutter)
```
Реализуй features/taxi/:
Domain:
- TaxiEstimate entity, CreateTaxiOrderParams
- EstimateTaxiUseCase, CreateTaxiOrderUseCase

Presentation (4 экрана):
1. TaxiAddressScreen: ввод точки A и B на карте или поиском,
   отображение маршрута полилинией на flutter_map
2. TaxiClassScreen: выбор класса (economy/comfort/business),
   отображение стоимости и ETA для каждого
3. TaxiPaymentScreen: выбор способа оплаты, промокод, итого
4. TaxiConfirmScreen: сводка + кнопка "Заказать"

TaxiOrderCubit: idle → estimating → selecting → confirming → searching

Тест: bloc_test на все переходы TaxiOrderCubit
```

#### B-05 · Заказ доставки — экраны (Flutter)
```
Реализуй features/delivery/:
Domain:
- DeliveryEstimate entity, CreateDeliveryOrderParams
  { fromAddress, toAddress, courierVehicleType, packageDescription,
    packagePhoto?, isFragile, requiresReturn, cashOnDelivery?,
    contactName, contactPhone }
- Enums: CourierVehicleType { bicycle, moped, scooter, car }

Presentation (5 экранов):
1. DeliveryAddressScreen: адрес отправителя и получателя
2. DeliveryDetailsScreen: описание, фото (image_picker), хрупкое,
   стоимость вложения, данные получателя
3. DeliveryVehicleScreen: выбор типа курьера с иконками и ценой
   (велосипед / мопед / самокат / авто), ETA для каждого
4. DeliveryPaymentScreen: способ оплаты, промокод
5. DeliveryConfirmScreen: сводка + "Заказать"

DeliveryOrderCubit: аналогично TaxiOrderCubit

Тест: bloc_test, unit на валидацию обязательных полей
```

#### B-06 · Активный заказ — трекинг (Flutter)
```
Реализуй features/active_order/:
- ActiveOrderScreen: карта с позицией исполнителя (обновляется
  через WebSocket), полилиния маршрута, статус, ETA, имя исполнителя
- WebSocket подключение через socket_io_client: подписка на
  order:status_changed, order:executor_location, order:eta_updated
- ActiveOrderCubit: обрабатывает WebSocket события,
  обновляет позицию маркера на карте плавно (Tween анимация)
- BottomSheet с деталями: имя, рейтинг, машина/велосипед, телефон (маск.)
- Кнопка "Отмена" с подтверждением
- По завершении заказа → RatingScreen

Тест: unit на логику обновления позиции, bloc_test на переходы
```

#### B-07 · История и профиль (Flutter)
```
Реализуй features/order_history/ и features/profile/:
- OrderHistoryScreen: список заказов (cursor pagination),
  фильтр по типу (такси/доставка), карточка заказа
- OrderDetailScreen: маршрут, стоимость, время, оценка, статус
- ProfileScreen: имя, телефон, язык (ru/kk), валюта (RUB/KZT),
  кнопка сменить язык → ChangeLocale event → перестройка всего UI
- PaymentsScreen: список сохранённых карт, добавить, удалить
- Тест: unit на currency/locale switching логику
```

#### B-08 · Приложение исполнителя (Flutter)
```
Реализуй второй entry point или отдельный flavor driver/:
Онбординг:
- DriverOnboardingScreen: загрузка документов (фото)
- DriverVerificationPendingScreen

Главный экран исполнителя:
- ExecutorHomeScreen: переключатель Online/Offline,
  текущий статус, баланс, карта с тепловыми зонами
- ExecutorStatusCubit: управляет isOnline, отправляет
  геопозицию каждые 5 сек когда онлайн (background_locator)

Входящие заказы:
- IncomingOrderSheet: BottomSheet с деталями оффера,
  таймер 20 сек, кнопки "Принять" / "Отклонить"
- WebSocket: слушает executor:incoming_order

Активный заказ исполнителя:
- ExecutorActiveOrderScreen: маршрут, статус-кнопки
  (На месте → Начать → Завершить), адрес, контакт клиента
- Для доставки: кнопки (Забрал → В пути → У двери → Вручил/Не вручил)
  + загрузка фото подтверждения

Тест: bloc_test на IncomingOrderCubit (accept/reject/timeout)
```

#### B-09 · Локализация и финальная полировка
```
Финализируй локализацию:
- Заполни все ключи в app_ru.arb и app_kk.arb для всех экранов
- Форматирование валют: NumberFormat.currency(locale:'ru', symbol:'₽')
  и NumberFormat.currency(locale:'kk', symbol:'₸')
- Форматирование дат по локали
- Push уведомления: локализованный текст по preferredLanguage пользователя
- Smoke тест: прогнать все экраны с kk локалью, проверить отсутствие overflow

Финальный чеклист перед сдачей B-блока:
□ Нет хардкода строк в виджетах
□ flutter analyze — 0 ошибок, 0 warnings
□ dart format — всё отформатировано
□ Все Cubit/Bloc покрыты bloc_test
□ Работает смена языка без перезапуска приложения
```

---

### БЛОК C: ТЕСТИРОВАНИЕ И ЗАПУСК

#### C-01 · Тестовое окружение
```
Настрой полный тестовый pipeline:
- docker-compose.test.yml: postgres test DB, redis test
- Jest конфиг: unit (src/**/*.spec.ts), integration (test/integration/),
  e2e (test/e2e/)
- Coverage report: lcov, html, пороги: statements 80%, branches 70%
- GitHub Actions workflow: lint → typecheck → unit → integration → e2e
- Flutter: flutter test --coverage, проверка flutter analyze
```

#### C-02 · E2E сценарии
```
Напиши полные E2E тесты (Supertest) для:
1. TAXI_FLOW: register → estimate → create_order → driver_accept
   → driver_arriving → driver_waiting → trip_start → complete
   → client_rate → check_payment_captured
2. DELIVERY_FLOW (x4 типа): для bicycle, moped, scooter, car:
   register_client → create_delivery → courier_accept
   → pickup → at_door → deliver_confirmed → check_notification_sent
3. PAYMENT_FLOW: bind_card → pay_with_hold → capture_on_complete
   → partial_refund_after_cancel
4. AUTH_FLOW: send_otp → wrong_code_3times → lockout
   → correct_code → refresh_token → logout
```

#### C-03 · MVP Чеклист приёмки
```
Перед сабмитом этапа 1 убедись что работает:
□ Регистрация по номеру телефона (RU и KZ номера)
□ Переключение языка ru ↔ kk на всех экранах
□ Переключение валюты RUB ↔ KZT
□ Создание заказа такси от А до Б с расчётом стоимости
□ Водитель получает оффер, принимает, завершает
□ Создание доставки с каждым из 4 типов курьера
□ Курьер проходит все статусы до "Вручено" с фото
□ Онлайн-оплата (stub провайдер): списание и возврат
□ Push-уведомление клиенту при принятии заказа
□ Трекинг исполнителя на карте в реальном времени
□ История заказов клиента
□ Admin: сменить тариф → новый заказ считается по новому тарифу
□ Admin: заблокировать водителя → он не получает заказы
□ Отчёт по финансам за период формируется без ошибок
```

---

## 9. ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ

```bash
# apps/api/.env.example

# App
NODE_ENV=development
PORT=3000
API_PREFIX=/api/v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/platform_db
DATABASE_URL_TEST=postgresql://user:password@localhost:5432/platform_test

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# OTP
OTP_LENGTH=4
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=3
OTP_DEV_BYPASS=true          # в dev всегда принимает код 1234

# SMS provider
SMS_PROVIDER=stub             # stub | smsc | mobizon
SMS_API_KEY=

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Object Storage (MinIO / S3)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=platform-files
S3_REGION=us-east-1

# Geo / OSM
NOMINATIM_URL=https://nominatim.openstreetmap.org
OSRM_URL=http://router.project-osrm.org
GEO_CACHE_TTL_SECONDS=86400

# Payment (stub for MVP)
PAYMENT_PROVIDER=stub
PAYMENT_WEBHOOK_SECRET=

# Currency rates
CURRENCY_RATES_TTL_SECONDS=3600
CBR_API_URL=https://www.cbr.ru/scripts/XML_daily.asp
NBK_API_URL=https://nationalbank.kz/rss/rates_all.xml

# Feature Flags
FEATURE_INTERCITY=false
FEATURE_CARGO=false
FEATURE_SCOOTERS=false
FEATURE_DELIVERY=true
FEATURE_TAXI=true

# RabbitMQ / BullMQ
QUEUE_URL=redis://localhost:6379   # BullMQ uses Redis
```

---

## 10. FEATURE FLAGS

Все новые модули включаются через `FEATURE_*` переменные. В коде:

```typescript
// NestJS
@Injectable()
export class FeatureGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const flag = this.reflector.get<string>('feature', context.getHandler());
    return process.env[`FEATURE_${flag.toUpperCase()}`] === 'true';
  }
}

// Использование:
@UseGuards(FeatureGuard)
@Feature('intercity')
@Get('/intercity/routes')
getRoutes() { ... }
```

Flutter:
```dart
// RemoteConfig или локальный config по flavor
class FeatureFlags {
  static bool get deliveryEnabled => AppConfig.instance.featureDelivery;
  static bool get intercityEnabled => AppConfig.instance.featureIntercity;
  // ...
}
```

---

## 11. СОГЛАШЕНИЕ ПО COMMIT И ВЕТКИ

```
main            — только стабильные релизы, тегируются v1.x.x
develop         — интеграционная ветка
feature/A-03-auth-module
feature/B-02-auth-flutter
fix/order-status-transition
chore/update-dependencies
```

Commit message формат:
```
feat(auth): add OTP rate limiting per IP

- 3 attempts per hour stored in Redis
- Returns 429 with retry-after header
- Covered by integration test

Closes #A-03
```

---

## 12. ВАЖНЫЕ ЗАПРЕТЫ

❌ Не хардкодить строки UI — только через ARB локализацию.
❌ Не хардкодить суммы или коэффициенты в коде — только из БД/конфига.
❌ Не хранить данные банковских карт — только токены провайдера.
❌ Не делать прямые переходы статуса заказа минуя `transition()`.
❌ Не пересчитывать курс валюты после фиксации в заказе.
❌ Не выполнять тяжёлые операции синхронно в HTTP запросе — только через BullMQ.
❌ Не коммитить `.env` файлы с реальными секретами.
❌ Не использовать `any` в TypeScript без явного комментария с причиной.
❌ Не добавлять новые эндпоинты без `@ApiOperation` и `@ApiResponse`.
❌ Не мержить ветку без прохождения CI (lint + tests).

---

## 13. CLOUD / GITHUB WORKFLOW

- Основной runbook: `docs/cloud-operations.md`.
- Работать через отдельные ветки и Pull Request.
- `main` считается production-ready веткой.
- GitHub Actions `DOS CI/CD` проверяет API, admin и Flutter.
- Production deploy выполняется только из проверенного checkout через VPS script `deploy/vps/scripts/ci-promote-release.sh`.
- Ручные production операции доступны только через GitHub Actions `DOS Production Ops`: `health`, `logs`, `restart`, `rollback`.
- Реальные `.env`, SSH ключи, mobile signing keys, Firebase service account и provider tokens не коммитить.
- Для разработки в Codex Cloud использовать отдельную тестовую конфигурацию и тестовую БД, не production DB.
