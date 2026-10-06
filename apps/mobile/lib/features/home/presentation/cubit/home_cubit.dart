import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/location/location_service.dart';
import '../../../active_order/domain/entities/active_order_session.dart';
import '../../../active_order/domain/repositories/active_order_repository.dart';
import '../../../taxi/domain/repositories/taxi_repository.dart';
import '../../domain/entities/address_suggestion.dart';
import '../../domain/entities/nearby_executor.dart';
import '../../domain/repositories/home_repository.dart';

part 'home_state.dart';

enum HomeServiceType {
  taxi('taxi'),
  intercity('intercity'),
  delivery('delivery');

  const HomeServiceType(this.apiValue);

  final String apiValue;
}

class HomeCubit extends Cubit<HomeState> {
  HomeCubit(
    this._homeRepository,
    this._activeOrderRepository,
    this._locationService,
    this._taxiRepository,
  ) : super(
        HomeState(
          selectedService: HomeServiceType.taxi,
          currentLocation: _defaultLocation,
          mapCenter: _defaultLocation,
          isResolvingCurrentLocation: true,
        ),
      );

  static final LatLng _defaultLocation = LatLng(43.238949, 76.889709);

  final HomeRepository _homeRepository;
  final ActiveOrderRepository _activeOrderRepository;
  final LocationService _locationService;
  final TaxiRepository _taxiRepository;
  Timer? _debounceTimer;
  int _searchRequestId = 0;
  int _routeRequestId = 0;

  Future<void> initialize() async {
    await resolveCurrentLocation();
    if (isClosed) {
      return;
    }

    if (state.currentAddress == null) {
      return;
    }

    final activeOrderResult = await _activeOrderRepository.fetchActiveOrder();
    if (isClosed) {
      return;
    }

    ActiveOrderSession? restoredSession;
    activeOrderResult.fold((_) {}, (session) => restoredSession = session);
    if (restoredSession != null) {
      emit(
        state.copyWith(
          restoredActiveOrderSession: restoredSession,
          errorMessage: null,
        ),
      );
      return;
    }

    await refreshNearbyExecutors();
  }

  void consumeRestoredActiveOrder() {
    emit(state.copyWith(restoredActiveOrderSession: null));
  }

  Future<void> setService(HomeServiceType serviceType) async {
    emit(state.copyWith(selectedService: serviceType));
    unawaited(_refreshRoute());
    await refreshNearbyExecutors();
  }

  Future<void> recenterToCurrentPosition() async {
    if (state.currentAddress == null) {
      await resolveCurrentLocation();
      return;
    }

    emit(
      state.copyWith(
        mapCenter: state.currentLocation,
        recenterRequestId: state.recenterRequestId + 1,
      ),
    );
  }

  Future<void> resolveCurrentLocation() async {
    emit(state.copyWith(isResolvingCurrentLocation: true, errorMessage: null));

    final locationResult = await _locationService.currentLocation();
    if (isClosed) {
      return;
    }

    await locationResult.fold(
      (failure) async {
        emit(
          state.copyWith(
            isResolvingCurrentLocation: false,
            errorMessage: failure.code,
          ),
        );
      },
      (location) async {
        emit(
          state.copyWith(
            currentLocation: location,
            mapCenter: location,
            isResolvingCurrentLocation: true,
            recenterRequestId: state.recenterRequestId + 1,
            errorMessage: null,
          ),
        );

        final addressResult = await _homeRepository.reverseGeocode(
          location: location,
        );
        if (isClosed) {
          return;
        }

        addressResult.fold(
          (failure) => emit(
            state.copyWith(
              isResolvingCurrentLocation: false,
              currentAddress: AddressSuggestion(
                title: '',
                subtitle: '',
                location: location,
              ),
              errorMessage: failure.code,
            ),
          ),
          (address) => emit(
            state.copyWith(
              currentLocation: location,
              mapCenter: location,
              currentAddress: AddressSuggestion(
                title: address.title,
                subtitle: address.subtitle,
                location: location,
              ),
              isResolvingCurrentLocation: false,
              recenterRequestId: state.recenterRequestId + 1,
              errorMessage: null,
            ),
          ),
        );
      },
    );
  }

  void onSearchQueryChanged(String query) {
    _debounceTimer?.cancel();
    final trimmed = query.trim();

    if (trimmed.isEmpty) {
      emit(
        state.copyWith(
          selectedAddress: null,
          routePoints: const [],
          searchResults: const [],
          isSearching: false,
          query: '',
        ),
      );
      return;
    }

    emit(
      state.copyWith(
        selectedAddress: null,
        routePoints: const [],
        query: trimmed,
        isSearching: true,
      ),
    );

    final requestId = ++_searchRequestId;
    _debounceTimer = Timer(const Duration(milliseconds: 300), () async {
      final result = await _homeRepository.searchAddresses(
        query: trimmed,
        locationBias: state.currentAddress?.location,
      );
      if (requestId != _searchRequestId || isClosed) {
        return;
      }

      result.fold(
        (failure) => emit(
          state.copyWith(
            isSearching: false,
            searchResults: const [],
            errorMessage: failure.message,
          ),
        ),
        (items) =>
            emit(state.copyWith(isSearching: false, searchResults: items)),
      );
    });
  }

  Future<void> selectAddress(AddressSuggestion suggestion) async {
    _debounceTimer?.cancel();
    _searchRequestId += 1;
    emit(
      state.copyWith(
        mapCenter: suggestion.location,
        selectedAddress: suggestion,
        routePoints: const [],
        searchResults: const [],
        isSearching: false,
        query: suggestion.displayTitle,
        errorMessage: null,
      ),
    );
    unawaited(_refreshRoute());
  }

  Future<void> selectDestinationFromMap(LatLng location) async {
    _debounceTimer?.cancel();
    _searchRequestId += 1;
    emit(
      state.copyWith(
        mapCenter: location,
        searchResults: const [],
        isSearching: false,
        isResolvingMapAddress: true,
        errorMessage: null,
      ),
    );

    final result = await _homeRepository.reverseGeocode(location: location);
    if (isClosed) {
      return;
    }

    result.fold(
      (failure) => emit(
        state.copyWith(
          isResolvingMapAddress: false,
          errorMessage: failure.code,
        ),
      ),
      (address) {
        final displayTitle = address.displayTitle.trim();
        if (displayTitle.isEmpty) {
          emit(
            state.copyWith(
              isResolvingMapAddress: false,
              errorMessage: 'HOME_REVERSE_GEOCODE_FAILED',
            ),
          );
          return;
        }

        emit(
          state.copyWith(
            mapCenter: address.location,
            selectedAddress: address,
            routePoints: const [],
            query: displayTitle,
            isResolvingMapAddress: false,
            errorMessage: null,
          ),
        );
        unawaited(_refreshRoute());
      },
    );
  }

  Future<void> _refreshRoute() async {
    final pickup = state.currentAddress;
    final destination = state.selectedAddress;
    if (pickup == null || destination == null) {
      emit(state.copyWith(routePoints: const []));
      return;
    }

    final requestId = ++_routeRequestId;
    final result = await _taxiRepository.buildRoute(
      pickup: pickup,
      destination: destination,
    );
    if (isClosed || requestId != _routeRequestId) {
      return;
    }

    result.fold(
      (_) => emit(state.copyWith(routePoints: const [])),
      (route) => emit(
        state.copyWith(
          routePoints: route.polylinePoints.length > 2
              ? route.polylinePoints
              : const [],
        ),
      ),
    );
  }

  Future<void> refreshNearbyExecutors() async {
    if (state.currentAddress == null) {
      return;
    }

    emit(state.copyWith(isLoadingNearby: true, errorMessage: null));
    final result = await _homeRepository.fetchNearbyExecutors(
      location: state.currentLocation,
      serviceType: state.selectedService.apiValue,
    );

    result.fold(
      (_) => emit(
        state.copyWith(
          isLoadingNearby: false,
          nearbyExecutors: const [],
          errorMessage: null,
        ),
      ),
      (items) => emit(
        state.copyWith(
          isLoadingNearby: false,
          nearbyExecutors: items,
          errorMessage: null,
        ),
      ),
    );
  }

  @override
  Future<void> close() {
    _debounceTimer?.cancel();
    return super.close();
  }
}
