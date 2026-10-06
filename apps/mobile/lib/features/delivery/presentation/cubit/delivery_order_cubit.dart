import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/errors/failure.dart';
import '../../../../core/utils/app_formatters.dart';
import '../../../home/domain/entities/address_suggestion.dart';
import '../../domain/entities/create_delivery_order_params.dart';
import '../../domain/entities/delivery_estimate.dart';
import '../../domain/entities/delivery_route_info.dart';
import '../../domain/enums/courier_vehicle_type.dart';
import '../../domain/repositories/delivery_repository.dart';
import '../../domain/usecases/create_delivery_order_use_case.dart';
import '../../domain/usecases/estimate_delivery_use_case.dart';
import '../../domain/usecases/validate_delivery_details_use_case.dart';

part 'delivery_order_state.dart';

enum DeliveryOrderStage {
  idle,
  detailing,
  estimating,
  selecting,
  paying,
  confirming,
  searching,
}

enum DeliveryPaymentMethod {
  cash('cash'),
  kaspi('transfer_kaspi'),
  halyk('transfer_halyk');

  const DeliveryPaymentMethod(this.apiValue);

  final String apiValue;
}

class DeliveryOrderCubit extends Cubit<DeliveryOrderState> {
  DeliveryOrderCubit({
    required DeliveryRepository deliveryRepository,
    required EstimateDeliveryUseCase estimateDeliveryUseCase,
    required CreateDeliveryOrderUseCase createDeliveryOrderUseCase,
    required ValidateDeliveryDetailsUseCase validateDeliveryDetailsUseCase,
  }) : _deliveryRepository = deliveryRepository,
       _estimateDeliveryUseCase = estimateDeliveryUseCase,
       _createDeliveryOrderUseCase = createDeliveryOrderUseCase,
       _validateDeliveryDetailsUseCase = validateDeliveryDetailsUseCase,
       super(const DeliveryOrderState());

  final DeliveryRepository _deliveryRepository;
  final EstimateDeliveryUseCase _estimateDeliveryUseCase;
  final CreateDeliveryOrderUseCase _createDeliveryOrderUseCase;
  final ValidateDeliveryDetailsUseCase _validateDeliveryDetailsUseCase;
  Timer? _searchDebounce;
  int _searchRequestId = 0;
  int _promoRequestId = 0;

  Future<void> startNewOrder({
    AddressSuggestion? initialFromAddress,
    AddressSuggestion? initialToAddress,
  }) async {
    ++_promoRequestId;
    emit(
      DeliveryOrderState(
        fromAddress: initialFromAddress,
        toAddress: initialToAddress,
        fromInput: _addressInputLabel(initialFromAddress),
        toInput: _addressInputLabel(initialToAddress),
      ),
    );
  }

  void searchFromQuery(String query) {
    _searchAddresses(query: query, isSender: true);
  }

  void searchToQuery(String query) {
    _searchAddresses(query: query, isSender: false);
  }

  void activateFromInput() {
    _activateSearchTarget(isSender: true);
  }

  void activateToInput() {
    _activateSearchTarget(isSender: false);
  }

  Future<void> submitFromQuery(String query) {
    return _searchAndSelectFirst(query: query, isSender: true);
  }

  Future<void> submitToQuery(String query) {
    return _searchAndSelectFirst(query: query, isSender: false);
  }

  void setFromAddress(AddressSuggestion suggestion) {
    _searchDebounce?.cancel();
    _searchRequestId += 1;
    ++_promoRequestId;
    emit(
      state.copyWith(
        fromAddress: suggestion,
        fromInput: _addressInputLabel(suggestion),
        routeInfo: null,
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
  }

  void setToAddress(AddressSuggestion suggestion) {
    _searchDebounce?.cancel();
    _searchRequestId += 1;
    ++_promoRequestId;
    emit(
      state.copyWith(
        toAddress: suggestion,
        toInput: _addressInputLabel(suggestion),
        routeInfo: null,
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
  }

  void clearFromAddress() {
    _searchDebounce?.cancel();
    _searchRequestId += 1;
    ++_promoRequestId;
    emit(
      state.copyWith(
        fromAddress: null,
        fromInput: '',
        routeInfo: null,
        estimates: const [],
        selectedEstimate: null,
        appliedPromoCode: '',
        isApplyingPromo: false,
        promoErrorCode: null,
        stage: DeliveryOrderStage.idle,
        searchResults: const [],
        isSearchingAddresses: false,
        isResolvingMapAddress: false,
        errorMessage: null,
      ),
    );
  }

  void clearToAddress() {
    _searchDebounce?.cancel();
    _searchRequestId += 1;
    ++_promoRequestId;
    emit(
      state.copyWith(
        toAddress: null,
        toInput: '',
        routeInfo: null,
        estimates: const [],
        selectedEstimate: null,
        appliedPromoCode: '',
        isApplyingPromo: false,
        promoErrorCode: null,
        stage: DeliveryOrderStage.idle,
        searchResults: const [],
        isSearchingAddresses: false,
        isResolvingMapAddress: false,
        errorMessage: null,
      ),
    );
  }

  Future<void> setFromAddressFromMap({
    required LatLng location,
    required String fallbackTitle,
  }) {
    return _setPointFromMap(
      location: location,
      fallbackTitle: fallbackTitle,
      isSender: true,
    );
  }

  Future<void> setToAddressFromMap({
    required LatLng location,
    required String fallbackTitle,
  }) {
    return _setPointFromMap(
      location: location,
      fallbackTitle: fallbackTitle,
      isSender: false,
    );
  }

  bool proceedToDetails() {
    if (state.fromAddress == null || state.toAddress == null) {
      emit(state.copyWith(errorMessage: 'DELIVERY_ADDRESSES_REQUIRED'));
      return false;
    }

    emit(
      state.copyWith(stage: DeliveryOrderStage.detailing, errorMessage: null),
    );
    return true;
  }

  Future<bool> saveDetails({
    required String packageDescription,
    required String contactName,
    required String contactPhone,
    String? packagePhotoPath,
    double? declaredValue,
    double? cashOnDelivery,
    required bool isFragile,
    required bool requiresReturn,
  }) async {
    final normalizedContactPhone = AppFormatters.normalizeKazakhstanPhone(
      contactPhone,
    );
    final validation = _validateDeliveryDetailsUseCase(
      ValidateDeliveryDetailsParams(
        packageDescription: packageDescription,
        contactName: contactName,
        contactPhone: normalizedContactPhone,
      ),
    );
    if (validation != null) {
      emit(state.copyWith(errorMessage: validation.code));
      return false;
    }

    emit(
      state.copyWith(
        packageDescription: packageDescription.trim(),
        packagePhotoPath: packagePhotoPath?.trim(),
        declaredValue: declaredValue,
        cashOnDelivery: cashOnDelivery,
        isFragile: isFragile,
        requiresReturn: requiresReturn,
        contactName: contactName.trim(),
        contactPhone: normalizedContactPhone,
        errorMessage: null,
      ),
    );

    return _estimateDelivery();
  }

  void selectVehicle(CourierVehicleType vehicleType) {
    DeliveryEstimate? selectedEstimate;
    for (final estimate in state.estimates) {
      if (estimate.vehicleType == vehicleType) {
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

  bool preparePayment() {
    if (state.selectedEstimate == null) {
      emit(state.copyWith(errorMessage: 'DELIVERY_VEHICLE_REQUIRED'));
      return false;
    }

    emit(state.copyWith(stage: DeliveryOrderStage.paying, errorMessage: null));
    return true;
  }

  void setPaymentMethod(DeliveryPaymentMethod paymentMethod) {
    emit(state.copyWith(paymentMethod: paymentMethod, errorMessage: null));
  }

  void setPromoCode(String promoCode) {
    final code = promoCode.trim().toUpperCase();
    if (code == state.promoCode) return;
    ++_promoRequestId;
    final estimates = state.estimates
        .map((estimate) => estimate.withoutPromo())
        .toList();
    DeliveryEstimate? selected;
    for (final estimate in estimates) {
      if (estimate.vehicleType == state.selectedEstimate?.vehicleType) {
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
    final from = state.fromAddress;
    final to = state.toAddress;
    final route = state.routeInfo;
    if (from == null || to == null || route == null) {
      emit(state.copyWith(promoErrorCode: 'DELIVERY_ORDER_INCOMPLETE'));
      return false;
    }
    final request = ++_promoRequestId;
    emit(state.copyWith(isApplyingPromo: true, promoErrorCode: null));
    final result = await _estimateDeliveryUseCase(
      EstimateDeliveryParams(
        fromAddress: from,
        toAddress: to,
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        isFragile: state.isFragile,
        requiresReturn: state.requiresReturn,
        declaredValue: state.declaredValue,
        cashOnDelivery: state.cashOnDelivery,
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
          if (estimate.vehicleType == state.selectedEstimate?.vehicleType) {
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

  bool prepareConfirmation() {
    if (state.selectedEstimate == null) {
      emit(state.copyWith(errorMessage: 'DELIVERY_VEHICLE_REQUIRED'));
      return false;
    }

    emit(
      state.copyWith(stage: DeliveryOrderStage.confirming, errorMessage: null),
    );
    return true;
  }

  Future<void> submitOrder() async {
    if (state.stage == DeliveryOrderStage.searching ||
        state.createdOrderId != null) {
      return;
    }

    if (state.isApplyingPromo) return;
    if (state.promoCode.isNotEmpty &&
        state.appliedPromoCode != state.promoCode) {
      if (!await applyPromoCode()) return;
    }

    final fromAddress = state.fromAddress;
    final toAddress = state.toAddress;
    final routeInfo = state.routeInfo;
    final selectedEstimate = state.selectedEstimate;

    if (fromAddress == null ||
        toAddress == null ||
        routeInfo == null ||
        selectedEstimate == null ||
        state.packageDescription.trim().isEmpty ||
        state.contactName.trim().isEmpty ||
        state.contactPhone.trim().isEmpty) {
      emit(state.copyWith(errorMessage: 'DELIVERY_ORDER_INCOMPLETE'));
      return;
    }

    emit(
      state.copyWith(
        stage: DeliveryOrderStage.searching,
        errorMessage: null,
        createdOrderId: null,
      ),
    );

    final result = await _createDeliveryOrderUseCase(
      CreateDeliveryOrderParams(
        fromAddress: fromAddress,
        toAddress: toAddress,
        courierVehicleType: selectedEstimate.vehicleType,
        packageDescription: state.packageDescription,
        packagePhotoPath: state.packagePhotoPath,
        isFragile: state.isFragile,
        requiresReturn: state.requiresReturn,
        declaredValue: state.declaredValue,
        cashOnDelivery: state.cashOnDelivery,
        contactName: state.contactName,
        contactPhone: state.contactPhone,
        distanceMeters: routeInfo.distanceMeters,
        durationSeconds: routeInfo.durationSeconds,
        paymentMethod: state.paymentMethod.apiValue,
        promoCode: state.promoCode.isEmpty ? null : state.promoCode,
      ),
    );

    result.fold(
      (failure) => emit(
        state.copyWith(
          stage: DeliveryOrderStage.confirming,
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

  void _activateSearchTarget({required bool isSender}) {
    _searchDebounce?.cancel();
    _searchRequestId += 1;
    ++_promoRequestId;
    emit(
      state.copyWith(
        searchResults: const [],
        isSearchingAddresses: false,
        isSearchingSender: isSender,
        errorMessage: null,
      ),
    );
  }

  void _searchAddresses({required String query, required bool isSender}) {
    _searchDebounce?.cancel();
    final trimmed = query.trim();

    if (trimmed.isEmpty) {
      if (isSender) {
        clearFromAddress();
      } else {
        clearToAddress();
      }
      return;
    }

    emit(
      state.copyWith(
        fromAddress: isSender ? null : _unset,
        toAddress: isSender ? _unset : null,
        fromInput: isSender ? query : null,
        toInput: isSender ? null : query,
        routeInfo: null,
        estimates: const [],
        selectedEstimate: null,
        appliedPromoCode: '',
        isApplyingPromo: false,
        promoErrorCode: null,
        stage: DeliveryOrderStage.idle,
        searchResults: const [],
        isSearchingAddresses: true,
        isSearchingSender: isSender,
        errorMessage: null,
      ),
    );

    final requestId = ++_searchRequestId;
    _searchDebounce = Timer(const Duration(milliseconds: 300), () async {
      final result = await _deliveryRepository.searchAddresses(
        query: trimmed,
        locationBias: _searchLocationBias(isSender: isSender),
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
            isSearchingSender: isSender,
          ),
        ),
      );
    });
  }

  Future<void> _searchAndSelectFirst({
    required String query,
    required bool isSender,
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
        isSearchingSender: isSender,
        searchResults: const [],
        errorMessage: null,
      ),
    );

    final result = await _deliveryRepository.searchAddresses(
      query: trimmed,
      locationBias: _searchLocationBias(isSender: isSender),
    );
    if (isClosed || requestId != _searchRequestId) {
      return;
    }

    result.fold((failure) => _emitFailure(failure), (items) {
      if (items.isEmpty) {
        emit(
          state.copyWith(
            isSearchingAddresses: false,
            errorMessage: 'ORDER_ADDRESS_NOT_FOUND',
          ),
        );
        return;
      }

      if (isSender) {
        setFromAddress(items.first);
      } else {
        setToAddress(items.first);
      }
    });
  }

  Future<void> _setPointFromMap({
    required LatLng location,
    required String fallbackTitle,
    required bool isSender,
  }) async {
    _searchDebounce?.cancel();
    _searchRequestId += 1;
    ++_promoRequestId;
    final fallback = AddressSuggestion(
      title: fallbackTitle,
      subtitle:
          '${location.latitude.toStringAsFixed(6)}, '
          '${location.longitude.toStringAsFixed(6)}',
      location: location,
    );

    emit(
      state.copyWith(
        fromAddress: isSender ? fallback : _unset,
        toAddress: isSender ? _unset : fallback,
        fromInput: isSender ? fallbackTitle : null,
        toInput: isSender ? null : fallbackTitle,
        routeInfo: null,
        estimates: const [],
        selectedEstimate: null,
        appliedPromoCode: '',
        isApplyingPromo: false,
        promoErrorCode: null,
        stage: DeliveryOrderStage.idle,
        searchResults: const [],
        isSearchingAddresses: false,
        isResolvingMapAddress: true,
        errorMessage: null,
        isSearchingSender: isSender,
      ),
    );

    final result = await _deliveryRepository.reverseGeocode(location: location);
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

    if (isSender) {
      setFromAddress(suggestion);
    } else {
      setToAddress(suggestion);
    }
  }

  Future<bool> _estimateDelivery() async {
    final fromAddress = state.fromAddress;
    final toAddress = state.toAddress;

    if (fromAddress == null || toAddress == null) {
      ++_promoRequestId;
      emit(state.copyWith(errorMessage: 'DELIVERY_ADDRESSES_REQUIRED'));
      return false;
    }

    emit(
      state.copyWith(
        stage: DeliveryOrderStage.estimating,
        appliedPromoCode: '',
        isApplyingPromo: false,
        promoErrorCode: null,
        errorMessage: null,
        createdOrderId: null,
      ),
    );

    final routeResult = await _deliveryRepository.buildRouteInfo(
      fromAddress: fromAddress,
      toAddress: toAddress,
    );

    final routeInfo = routeResult.fold<DeliveryRouteInfo?>((failure) {
      _emitFailure(failure);
      return null;
    }, (value) => value);
    if (routeInfo == null) {
      return false;
    }

    final estimateResult = await _estimateDeliveryUseCase(
      EstimateDeliveryParams(
        fromAddress: fromAddress,
        toAddress: toAddress,
        distanceMeters: routeInfo.distanceMeters,
        durationSeconds: routeInfo.durationSeconds,
        isFragile: state.isFragile,
        requiresReturn: state.requiresReturn,
        declaredValue: state.declaredValue,
        cashOnDelivery: state.cashOnDelivery,
      ),
    );

    return estimateResult.fold(
      (failure) {
        _emitFailure(failure);
        return false;
      },
      (estimates) {
        emit(
          state.copyWith(
            stage: DeliveryOrderStage.selecting,
            routeInfo: routeInfo,
            estimates: estimates,
            selectedEstimate: estimates.isNotEmpty ? estimates.first : null,
            errorMessage: null,
          ),
        );
        return true;
      },
    );
  }

  void _emitFailure(Failure failure) {
    emit(
      state.copyWith(
        isSearchingAddresses: false,
        isResolvingMapAddress: false,
        stage: DeliveryOrderStage.idle,
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

  LatLng? _searchLocationBias({required bool isSender}) {
    if (isSender) {
      return _usableLocation(state.fromAddress) ??
          _usableLocation(state.toAddress);
    }

    return _usableLocation(state.fromAddress) ??
        _usableLocation(state.toAddress);
  }

  LatLng? _usableLocation(AddressSuggestion? address) {
    if (address == null || address.displayTitle.trim().isEmpty) {
      return null;
    }

    return address.location;
  }
}
