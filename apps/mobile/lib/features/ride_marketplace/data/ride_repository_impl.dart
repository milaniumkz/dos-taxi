import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import '../../../core/api/api_client.dart';
import '../../../core/errors/failure.dart';
import '../../active_order/data/models/active_order_session_model.dart';
import '../../active_order/domain/entities/active_order_session.dart';
import '../domain/ride_repository.dart';

class RideRepositoryImpl implements RideRepository {
  RideRepositoryImpl(this.client);
  final ApiClient client;
  @override
  Future<Either<Failure, List<Map<String, dynamic>>>> cities() =>
      _guard(() async {
        final response = await client.dio.get<List<dynamic>>(
          '/ride-requests/cities',
        );
        return (response.data ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      });
  Future<Either<Failure, T>> _guard<T>(Future<T> Function() work) async {
    try {
      return Right(await client.guard(work));
    } on Failure catch (error) {
      return Left(error);
    }
  }

  Future<Map<String, dynamic>> _get(
    String path, [
    Map<String, dynamic>? query,
  ]) async => (await client.dio.get<Map<String, dynamic>>(
    path,
    queryParameters: query,
  )).data!;
  Future<Map<String, dynamic>> _post(
    String path,
    Map<String, dynamic> data, [
    String? key,
  ]) async => (await client.dio.post<Map<String, dynamic>>(
    path,
    data: data,
    options: Options(headers: key == null ? null : {'X-Idempotency-Key': key}),
  )).data!;
  @override
  Future<Either<Failure, Map<String, dynamic>>> quote(
    Map<String, dynamic> data,
  ) => _guard(() => _post('/ride-requests/quote', data));
  @override
  Future<Either<Failure, ActiveOrderSession>> create(
    Map<String, dynamic> data,
    String key,
  ) => _guard(
    () async => ActiveOrderSessionModel.fromJson(
      await _post('/ride-requests', data, key),
    ),
  );
  @override
  Future<Either<Failure, Map<String, dynamic>>> offers(String id) =>
      _guard(() => _get('/ride-requests/$id/offers'));
  @override
  Future<Either<Failure, ActiveOrderSession>> accept(
    String id,
    String offerId,
    int version,
  ) => _guard(
    () async => ActiveOrderSessionModel.fromJson(
      await _post('/ride-requests/$id/offers/$offerId/accept', {
        'version': version,
      }),
    ),
  );
  @override
  Future<Either<Failure, Map<String, dynamic>>> feed(
    double lat,
    double lng,
    int offset,
  ) => _guard(
    () =>
        _get('/ride-requests/feed', {'lat': lat, 'lng': lng, 'offset': offset}),
  );
  @override
  Future<Either<Failure, Map<String, dynamic>>> propose(
    String id,
    int steps,
    bool childSeat,
  ) => _guard(
    () => _post('/ride-requests/$id/offers', {
      'priceSteps': steps,
      'hasChildSeat': childSeat,
    }),
  );
  @override
  Future<Either<Failure, Map<String, dynamic>>> withdraw(String id) =>
      _guard(() => _post('/ride-requests/$id/offers/withdraw', {}));
}
