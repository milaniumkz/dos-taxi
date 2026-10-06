part of 'taxi_order_cubit.dart';

const _unset = Object();

class TaxiOrderState extends Equatable {
  const TaxiOrderState({
    this.stage = TaxiOrderStage.idle,
    this.pickup,
    this.destination,
    this.pickupInput = '',
    this.destinationInput = '',
    this.serviceType = 'taxi',
    this.route,
    this.estimates = const [],
    this.selectedEstimate,
    this.paymentMethod = TaxiPaymentMethod.cash,
    this.promoCode = '',
    this.appliedPromoCode = '',
    this.isApplyingPromo = false,
    this.promoErrorCode,
    this.searchResults = const [],
    this.isSearchingAddresses = false,
    this.isSearchingPickup = false,
    this.isResolvingMapAddress = false,
    this.createdOrderId,
    this.errorMessage,
  });

  final TaxiOrderStage stage;
  final AddressSuggestion? pickup;
  final AddressSuggestion? destination;
  final String pickupInput;
  final String destinationInput;
  final String serviceType;
  final TaxiRoute? route;
  final List<TaxiEstimate> estimates;
  final TaxiEstimate? selectedEstimate;
  final TaxiPaymentMethod paymentMethod;
  final String promoCode;
  final String appliedPromoCode;
  final bool isApplyingPromo;
  final String? promoErrorCode;
  final List<AddressSuggestion> searchResults;
  final bool isSearchingAddresses;
  final bool isSearchingPickup;
  final bool isResolvingMapAddress;
  final String? createdOrderId;
  final String? errorMessage;

  bool get canContinueFromAddressStep =>
      pickup != null && destination != null && route != null;

  TaxiOrderState copyWith({
    TaxiOrderStage? stage,
    Object? pickup = _unset,
    Object? destination = _unset,
    String? pickupInput,
    String? destinationInput,
    String? serviceType,
    Object? route = _unset,
    List<TaxiEstimate>? estimates,
    Object? selectedEstimate = _unset,
    TaxiPaymentMethod? paymentMethod,
    String? promoCode,
    String? appliedPromoCode,
    bool? isApplyingPromo,
    Object? promoErrorCode = _unset,
    List<AddressSuggestion>? searchResults,
    bool? isSearchingAddresses,
    bool? isSearchingPickup,
    bool? isResolvingMapAddress,
    Object? createdOrderId = _unset,
    Object? errorMessage = _unset,
  }) {
    return TaxiOrderState(
      stage: stage ?? this.stage,
      pickup: pickup == _unset ? this.pickup : pickup as AddressSuggestion?,
      destination: destination == _unset
          ? this.destination
          : destination as AddressSuggestion?,
      pickupInput: pickupInput ?? this.pickupInput,
      destinationInput: destinationInput ?? this.destinationInput,
      serviceType: serviceType ?? this.serviceType,
      route: route == _unset ? this.route : route as TaxiRoute?,
      estimates: estimates ?? this.estimates,
      selectedEstimate: selectedEstimate == _unset
          ? this.selectedEstimate
          : selectedEstimate as TaxiEstimate?,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      promoCode: promoCode ?? this.promoCode,
      appliedPromoCode: appliedPromoCode ?? this.appliedPromoCode,
      isApplyingPromo: isApplyingPromo ?? this.isApplyingPromo,
      promoErrorCode: promoErrorCode == _unset
          ? this.promoErrorCode
          : promoErrorCode as String?,
      searchResults: searchResults ?? this.searchResults,
      isSearchingAddresses: isSearchingAddresses ?? this.isSearchingAddresses,
      isSearchingPickup: isSearchingPickup ?? this.isSearchingPickup,
      isResolvingMapAddress:
          isResolvingMapAddress ?? this.isResolvingMapAddress,
      createdOrderId: createdOrderId == _unset
          ? this.createdOrderId
          : createdOrderId as String?,
      errorMessage: errorMessage == _unset
          ? this.errorMessage
          : errorMessage as String?,
    );
  }

  @override
  List<Object?> get props => [
    stage,
    pickup,
    destination,
    pickupInput,
    destinationInput,
    serviceType,
    route,
    estimates,
    selectedEstimate,
    paymentMethod,
    promoCode,
    appliedPromoCode,
    isApplyingPromo,
    promoErrorCode,
    searchResults,
    isSearchingAddresses,
    isSearchingPickup,
    isResolvingMapAddress,
    createdOrderId,
    errorMessage,
  ];
}
