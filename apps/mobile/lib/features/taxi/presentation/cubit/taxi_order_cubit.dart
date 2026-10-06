import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/errors/failure.dart';
import '../../../home/domain/entities/address_suggestion.dart';
import '../../domain/entities/create_taxi_order_params.dart';
import '../../domain/entities/taxi_estimate.dart';
import '../../domain/entities/taxi_route.dart';
import '../../domain/repositories/taxi_repository.dart';
import '../../domain/usecases/create_taxi_order_use_case.dart';
import '../../domain/usecases/estimate_taxi_use_case.dart';

part 'taxi_order_state.dart';

enum TaxiOrderStage { idle, estimating, selecting, searching }

enum TaxiPaymentMethod {
  cash('cash'),
  kaspi('transfer_kaspi'),
  halyk('transfer_halyk');

  const TaxiPaymentMethod(this.apiValue);

  final String apiValue;
}

class TaxiOrderCubit extends Cubit<TaxiOrderState> {
  TaxiOrderCubit({
    required TaxiRepository taxiRepository,
    required EstimateTaxiUseCase estimateTaxiUseCase,
    required CreateTaxiOrderUseCase createTaxiOrderUseCase,
  }) : _taxiRepository = taxiRepository,
       _estimateTaxiUseCase = estimateTaxiUseCase,
       _createTaxiOrderUseCase = createTaxiOrderUseCase,
       super(const TaxiOrderState());

  final TaxiRepository _taxiRepository;
  final EstimateTaxiUseCase _estimateTaxiUseCase;
  final CreateTaxiOrderUseCase _createTaxiOrderUseCase;
  Timer? _searchDebounce;
  int _searchRequestId = 0;
  int _promoRequestId = 0;

  Future<void> startNewOrder({
    AddressSuggestion? initialPickup,
    AddressSuggestion? initialDestination,
    String serviceType = 'taxi',
  }) async {
    ++_promoRequestId;
    emit(
      TaxiOrderState(
        pickup: initialPickup,
        destination: initialDestination,
        serviceType: serviceType,
        pickupInput: _addressInputLabel(initialPickup),
        destinationInput: _addressInputLabel(initialDestination),
      ),
    );

    if (initialPickup != null && initialDestination != null) {
      await _recalculateRouteAndEstimates();
    }
  }

  void searchPickupQuery(String query) {
    _searchAddresses(query: query, isPickup: true);
  }

  void searchDestinationQuery(String query) {
    _searchAddresses(query: query, isPickup: false);
  }

  void activatePickupInput() {
    _activateSearchTarget(isPickup: true);
  }

  void activateDestinationInput() {
    _activateSearchTarget(isPickup: false);
  }

  Future<void> submitPickupQuery(String query) {
    return _searchAndSelectFirst(query: query, isPickup: true);
  }

  Future<void> submitDestinationQuery(String query) {
    return _searchAndSelectFirst(query: query, isPickup: false);
  }

  Future<void> applyManualPickupAddress(String query) {
    return _applyManualAddress(query: query, isPickup: true);
  }

  Future<void> applyManualDestinationAddress(String query) {
    return _applyManualAddress(query: query, isPickup: false);
  }

  Future<void> setPickup(AddressSuggestion suggestion) async {
    _searchDebounce?.cancel();
    _searchRequestId += 1;
    ++_promoRequestId;
    emit(
      state.copyWith(
        pickup: suggestion,
        pickupInput: _addressInputLabel(suggestion),
        route: null,
        estimates: const [],
        selectedEstimate: null,
        appliedPromoCode: '',
        isApplyingPromo: false,
        promoErrorCode: null,
        searchResults: const [],
        isSearchingAddresses: false,
        isResolvingMapAddress: false,
        errorMessage: null,
      ),
    );
    if (state.destination != null) {
      await _recalculateRouteAndEstimates();
    }
  }

  Future<void> setDestination(AddressSuggestion suggestion) async {
    _searchDebounce?.cancel();
    _searchRequestId += 1;
    ++_promoRequestId;
    emit(
      state.copyWith(
        destination: suggestion,
        destinationInput: _addressInputLabel(suggestion),
        route: null,
        estimates: const [],
        selectedEstimate: null,
        appliedPromoCode: '',
        isApplyingPromo: false,
        promoErrorCode: null,
        searchResults: const [],
        isSearchingAddresses: false,
        isResolvingMapAddress: false,
        errorMessage: null,
      ),
    );
    if (state.pickup != null) {
      await _recalculateRouteAndEstimates();
    }
  }

  void clearPickup() {
    _searchDebounce?.cancel();
    _searchRequestId += 1;
    ++_promoRequestId;
    emit(
      state.copyWith(
        pickup: null,
        pickupInput: '',
        route: null,
        estimates: const [],
        selectedEstimate: null,
        appliedPromoCode: '',
        isApplyingPromo: false,
        promoErrorCode: null,
        stage: TaxiOrderStage.idle,
        searchResults: const [],
        isSearchingAddresses: false,
        isResolvingMapAddress: false,
        errorMessage: null,
      ),
    );
  }

  void clearDestination() {
    _searchDebounce?.cancel();
    _searchRequestId += 1;
    ++_promoRequestId;
    emit(
      state.copyWith(
        destination: null,
        destinationInput: '',
        route: null,
        estimates: const [],
        selectedEstimate: null,
        appliedPromoCode: '',
        isApplyingPromo: false,
        promoErrorCode: null,
        stage: TaxiOrderStage.idle,
        searchResults: const [],
        isSearchingAddresses: false,
        isResolvingMapAddress: false,
        errorMessage: null,
      ),
    );
  }

  Future<void> setPickupFromMap({
    required LatLng location,
    required String fallbackTitle,
  }) {
    return _setPointFromMap(
      location: location,
      fallbackTitle: fallbackTitle,
      isPickup: true,
    );
  }

  Future<void> setDestinationFromMap({
    required LatLng location,
    required String fallbackTitle,
  }) {
    return _setPointFromMap(
      location: location,
      fallbackTitle: fallbackTitle,
      isPickup: false,
    );
  }

  void selectCarClass(String carClass) {
    TaxiEstimate? selectedEstimate;
    for (final estimate in state.estimates) {
      if (estimate.carClass == carClass) {
        selectedEstimate = estimate;
        break;
      }
    }
    if (selectedEstimate == null) {
      return;
    }

    emit(
      state.copyWith(selectedEstimate: selectedEstimate, errorMessage: null),
    );
  }

  void setPaymentMethod(TaxiPaymentMethod paymentMethod) {
    emit(state.copyWith(paymentMethod: paymentMethod, errorMessage: null));
  }

  void setPromoCode(String promoCode) {
    final code = promoCode.trim().toUpperCase();
    if (code == state.promoCode) return;
    ++_promoRequestId;
    final estimates = state.estimates
        .map((estimate) => estimate.withoutPromo())
        .toList();
    TaxiEstimate? selected;
    for (final estimate in estimates) {
      if (estimate.carClass == state.selectedEstimate?.carClass) {
        selected = estimate;
      }
    }
    emit(
      state.copyWith(
        promoCode: code,
        appliedPromoCode: '',
        isApplyingPromo: false,
        promoErrorCode: null,
        estimates: estimates,
        selectedEstimate: selected,
        errorMessage: null,
      ),
    );
  }

  Future<bool> applyPromoCode() async {
    if (state.isApplyingPromo) return false;
    final code = state.promoCode;
    if (code.isEmpty) return true;
    if (code == state.appliedPromoCode) return true;
    final from = state.pickup;
    final to = state.destination;
    final route = state.route;
    if (from == null || to == null || route == null) {
      emit(state.copyWith(promoErrorCode: 'TAXI_ORDER_INCOMPLETE'));
      return false;
    }
    final request = ++_promoRequestId;
    emit(state.copyWith(isApplyingPromo: true, promoErrorCode: null));
    final result = await _estimateTaxiUseCase(
      EstimateTaxiParams(
        pickup: from,
        destination: to,
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        serviceType: state.serviceType,
        promoCode: code,
      ),
    );
    if (isClosed || request != _promoRequestId) return false;
    return result.fold(
      (failure) {
        emit(
          state.copyWith(isApplyingPromo: false, promoErrorCode: failure.code),
        );
        return false;
      },
      (estimates) {
        if (estimates.isEmpty) {
          emit(
            state.copyWith(
              isApplyingPromo: false,
              promoErrorCode: 'PROMO_CODE_INVALID_PRICE',
            ),
          );
          return false;
        }
        var selected = estimates.first;
        for (final estimate in estimates) {
          if (estimate.carClass == state.selectedEstimate?.carClass) {
            selected = estimate;
          }
        }
        emit(
          state.copyWith(
            isApplyingPromo: false,
            promoErrorCode: null,
            appliedPromoCode: code,
            estimates: estimates,
            selectedEstimate: selected,
          ),
        );
        return true;
      },
    );
  }

  Future<void> submitOrder() async {
    if (state.stage == TaxiOrderStage.searching ||
        state.createdOrderId != null) {
      return;
    }

    if (state.isApplyingPromo) return;
    if (state.promoCode.isNotEmpty &&
        state.appliedPromoCode != state.promoCode) {
      if (!await applyPromoCode()) return;
    }

    final pickup = state.pickup;
    final destination = state.destination;
    final selectedEstimate = state.selectedEstimate;
    final route = state.route;

    if (pickup == null ||
        destination == null ||
        selectedEstimate == null ||
        route == null) {
      emit(state.copyWith(errorMessage: 'TAXI_ORDER_INCOMPLETE'));
      return;
    }

    emit(
      state.copyWith(
        stage: TaxiOrderStage.searching,
        errorMessage: null,
        createdOrderId: null,
      ),
    );

    final result = await _createTaxiOrderUseCase(
      CreateTaxiOrderParams(
        pickup: pickup,
        destination: destination,
        carClass: selectedEstimate.carClass,
        paymentMethod: state.paymentMethod.apiValue,
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        serviceType: state.serviceType,
        promoCode: state.promoCode.isEmpty ? null : state.promoCode,
      ),
    );

    result.fold(
      (failure) => emit(
        state.copyWith(
          stage: TaxiOrderStage.selecting,
          errorMessage: failure.code.startsWith('PROMO_CODE_') ? failure.code : failure.message,
        ),
      ),
      (orderId) => emit(state.copyWith(createdOrderId: orderId)),
    );
  }

  @override
  Future<void> close() {
    _searchDebounce?.cancel();
    return super.close();
  }

  void _activateSearchTarget({required bool isPickup}) {
    _searchDebounce?.cancel();
    _searchRequestId += 1;
    ++_promoRequestId;
    emit(
      state.copyWith(
        searchResults: const [],
        isSearchingAddresses: false,
        isSearchingPickup: isPickup,
        errorMessage: null,
      ),
    );
  }

  void _searchAddresses({required String query, required bool isPickup}) {
    _searchDebounce?.cancel();
    final trimmed = query.trim();

    if (trimmed.isEmpty) {
      if (isPickup) {
        clearPickup();
      } else {
        clearDestination();
      }
      return;
    }

    final nextState = state.copyWith(
      pickup: isPickup ? state.pickup : _unset,
      destination: isPickup ? _unset : state.destination,
      pickupInput: isPickup ? query : null,
      destinationInput: isPickup ? null : query,
      route: null,
      estimates: const [],
      selectedEstimate: null,
      stage: TaxiOrderStage.idle,
      searchResults: const [],
      isSearchingAddresses: true,
      errorMessage: null,
      isSearchingPickup: isPickup,
    );
    emit(nextState);

    final requestId = ++_searchRequestId;
    _searchDebounce = Timer(const Duration(milliseconds: 300), () async {
      final result = await _taxiRepository.searchAddresses(
        query: trimmed,
        locationBias: _searchLocationBias(isPickup: isPickup),
      );
      if (isClosed || requestId != _searchRequestId) {
        return;
      }

      result.fold(
        _emitFailure,
        (items) => emit(
          state.copyWith(
            isSearchingAddresses: false,
            searchResults: items,
            isSearchingPickup: isPickup,
          ),
        ),
      );
    });
  }

  Future<void> _searchAndSelectFirst({
    required String query,
    required bool isPickup,
  }) async {
    _searchDebounce?.cancel();
    final trimmed = query.trim();
    if (trimmed.isEmpty) {
      return;
    }

    final requestId = ++_searchRequestId;
    emit(
      state.copyWith(
        isSearchingAddresses: true,
        isSearchingPickup: isPickup,
        searchResults: const [],
        errorMessage: null,
      ),
    );

    final result = await _taxiRepository.searchAddresses(
      query: trimmed,
      locationBias: _searchLocationBias(isPickup: isPickup),
    );
    if (isClosed || requestId != _searchRequestId) {
      return;
    }

    await result.fold((failure) async => _emitFailure(failure), (items) async {
      if (items.isEmpty) {
        emit(
          state.copyWith(
            isSearchingAddresses: false,
            errorMessage: 'ORDER_ADDRESS_NOT_FOUND',
          ),
        );
        return;
      }

      if (isPickup) {
        await setPickup(items.first);
      } else {
        await setDestination(items.first);
      }
    });
  }

  Future<void> _applyManualAddress({
    required String query,
    required bool isPickup,
  }) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty) {
      return;
    }

    final existingPoint = isPickup ? state.pickup : state.destination;
    if (existingPoint == null) {
      emit(state.copyWith(errorMessage: 'ORDER_MANUAL_ADDRESS_NEEDS_POINT'));
      return;
    }

    final manualAddress = AddressSuggestion(
      title: trimmed,
      subtitle: '',
      location: existingPoint.location,
    );

    if (isPickup) {
      await setPickup(manualAddress);
    } else {
      await setDestination(manualAddress);
    }
  }

  Future<void> _setPointFromMap({
    required LatLng location,
    required String fallbackTitle,
    required bool isPickup,
  }) async {
    _searchDebounce?.cancel();
    _searchRequestId += 1;
    ++_promoRequestId;
    final fallback = AddressSuggestion(
      title: fallbackTitle,
      subtitle: '',
      location: location,
    );

    emit(
      state.copyWith(
        pickup: isPickup ? fallback : _unset,
        destination: isPickup ? _unset : fallback,
        pickupInput: isPickup ? fallbackTitle : null,
        destinationInput: isPickup ? null : fallbackTitle,
        route: null,
        estimates: const [],
        selectedEstimate: null,
        appliedPromoCode: '',
        isApplyingPromo: false,
        promoErrorCode: null,
        stage: TaxiOrderStage.idle,
        searchResults: const [],
        isSearchingAddresses: false,
        isResolvingMapAddress: true,
        errorMessage: null,
        isSearchingPickup: isPickup,
      ),
    );

    final result = await _taxiRepository.reverseGeocode(location: location);
    if (isClosed) {
      return;
    }

    final suggestion = result.fold((_) => fallback, (value) {
      if (value.title.trim().isEmpty && value.subtitle.trim().isEmpty) {
        return fallback;
      }
      return AddressSuggestion(
        title: value.title,
        subtitle: value.subtitle,
        location: location,
      );
    });

    if (isPickup) {
      await setPickup(suggestion);
    } else {
      await setDestination(suggestion);
    }
  }

  Future<void> _recalculateRouteAndEstimates() async {
    final pickup = state.pickup;
    final destination = state.destination;
    if (pickup == null || destination == null) {
      return;
    }

    emit(
      state.copyWith(
        stage: TaxiOrderStage.estimating,
        errorMessage: null,
        createdOrderId: null,
      ),
    );

    final routeResult = await _taxiRepository.buildRoute(
      pickup: pickup,
      destination: destination,
    );

    final route = await routeResult.fold<Future<TaxiRoute?>>((failure) async {
      _emitFailure(failure);
      return null;
    }, (value) async => value);

    if (route == null) {
      return;
    }

    final estimateResult = await _estimateTaxiUseCase(
      EstimateTaxiParams(
        pickup: pickup,
        destination: destination,
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        serviceType: state.serviceType,
      ),
    );

    estimateResult.fold(_emitFailure, (estimates) {
      emit(
        state.copyWith(
          stage: TaxiOrderStage.selecting,
          route: route,
          estimates: estimates,
          selectedEstimate: estimates.isNotEmpty ? estimates.first : null,
          errorMessage: null,
        ),
      );
    });
  }

  void _emitFailure(Failure failure) {
    emit(
      state.copyWith(
        isSearchingAddresses: false,
        isResolvingMapAddress: false,
        stage: TaxiOrderStage.idle,
        errorMessage: failure.message,
      ),
    );
  }

  String _addressInputLabel(AddressSuggestion? address) {
    if (address == null) {
      return '';
    }
    final displayTitle = address.displayTitle;
    if (displayTitle.trim().isNotEmpty) {
      return displayTitle;
    }
    return address.subtitle;
  }

  LatLng? _searchLocationBias({required bool isPickup}) {
    if (isPickup) {
      return _usableLocation(state.pickup) ??
          _usableLocation(state.destination);
    }

    return _usableLocation(state.pickup) ?? _usableLocation(state.destination);
  }

  LatLng? _usableLocation(AddressSuggestion? address) {
    if (address == null || address.displayTitle.trim().isEmpty) {
      return null;
    }

    return address.location;
  }
}
