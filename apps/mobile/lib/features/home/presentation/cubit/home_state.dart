part of 'home_cubit.dart';

class HomeState extends Equatable {
  const HomeState({
    required this.selectedService,
    required this.currentLocation,
    required this.mapCenter,
    this.searchResults = const [],
    this.nearbyExecutors = const [],
    this.routePoints = const [],
    this.currentAddress,
    this.selectedAddress,
    this.isSearching = false,
    this.isLoadingNearby = false,
    this.isResolvingCurrentLocation = false,
    this.isResolvingMapAddress = false,
    this.recenterRequestId = 0,
    this.query = '',
    this.restoredActiveOrderSession,
    this.errorMessage,
  });

  final HomeServiceType selectedService;
  final LatLng currentLocation;
  final LatLng mapCenter;
  final List<AddressSuggestion> searchResults;
  final List<NearbyExecutor> nearbyExecutors;
  final List<LatLng> routePoints;
  final AddressSuggestion? currentAddress;
  final AddressSuggestion? selectedAddress;
  final bool isSearching;
  final bool isLoadingNearby;
  final bool isResolvingCurrentLocation;
  final bool isResolvingMapAddress;
  final int recenterRequestId;
  final String query;
  final ActiveOrderSession? restoredActiveOrderSession;
  final String? errorMessage;

  HomeState copyWith({
    HomeServiceType? selectedService,
    LatLng? currentLocation,
    LatLng? mapCenter,
    List<AddressSuggestion>? searchResults,
    List<NearbyExecutor>? nearbyExecutors,
    List<LatLng>? routePoints,
    Object? currentAddress = _unset,
    Object? selectedAddress = _unset,
    bool? isSearching,
    bool? isLoadingNearby,
    bool? isResolvingCurrentLocation,
    bool? isResolvingMapAddress,
    int? recenterRequestId,
    String? query,
    Object? restoredActiveOrderSession = _unset,
    String? errorMessage,
  }) {
    return HomeState(
      selectedService: selectedService ?? this.selectedService,
      currentLocation: currentLocation ?? this.currentLocation,
      mapCenter: mapCenter ?? this.mapCenter,
      searchResults: searchResults ?? this.searchResults,
      nearbyExecutors: nearbyExecutors ?? this.nearbyExecutors,
      routePoints: routePoints ?? this.routePoints,
      currentAddress: currentAddress == _unset
          ? this.currentAddress
          : currentAddress as AddressSuggestion?,
      selectedAddress: selectedAddress == _unset
          ? this.selectedAddress
          : selectedAddress as AddressSuggestion?,
      isSearching: isSearching ?? this.isSearching,
      isLoadingNearby: isLoadingNearby ?? this.isLoadingNearby,
      isResolvingCurrentLocation:
          isResolvingCurrentLocation ?? this.isResolvingCurrentLocation,
      isResolvingMapAddress:
          isResolvingMapAddress ?? this.isResolvingMapAddress,
      recenterRequestId: recenterRequestId ?? this.recenterRequestId,
      query: query ?? this.query,
      restoredActiveOrderSession: restoredActiveOrderSession == _unset
          ? this.restoredActiveOrderSession
          : restoredActiveOrderSession as ActiveOrderSession?,
      errorMessage: errorMessage,
    );
  }

  @override
  List<Object?> get props => [
    selectedService,
    currentLocation,
    mapCenter,
    searchResults,
    nearbyExecutors,
    routePoints,
    currentAddress,
    selectedAddress,
    isSearching,
    isLoadingNearby,
    isResolvingCurrentLocation,
    isResolvingMapAddress,
    recenterRequestId,
    query,
    restoredActiveOrderSession,
    errorMessage,
  ];
}

const _unset = Object();
