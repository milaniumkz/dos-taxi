part of 'delivery_order_cubit.dart';

const _unset = Object();

class DeliveryOrderState extends Equatable {
  const DeliveryOrderState({
    this.stage = DeliveryOrderStage.idle,
    this.fromAddress,
    this.toAddress,
    this.fromInput = '',
    this.toInput = '',
    this.routeInfo,
    this.packageDescription = '',
    this.packagePhotoPath,
    this.isFragile = false,
    this.requiresReturn = false,
    this.declaredValue,
    this.cashOnDelivery,
    this.contactName = '',
    this.contactPhone = '',
    this.estimates = const [],
    this.selectedEstimate,
    this.paymentMethod = DeliveryPaymentMethod.cash,
    this.promoCode = '',
    this.searchResults = const [],
    this.isSearchingAddresses = false,
    this.isSearchingSender = false,
    this.isResolvingMapAddress = false,
    this.createdOrderId,
    this.errorMessage,
  });

  final DeliveryOrderStage stage;
  final AddressSuggestion? fromAddress;
  final AddressSuggestion? toAddress;
  final String fromInput;
  final String toInput;
  final DeliveryRouteInfo? routeInfo;
  final String packageDescription;
  final String? packagePhotoPath;
  final bool isFragile;
  final bool requiresReturn;
  final double? declaredValue;
  final double? cashOnDelivery;
  final String contactName;
  final String contactPhone;
  final List<DeliveryEstimate> estimates;
  final DeliveryEstimate? selectedEstimate;
  final DeliveryPaymentMethod paymentMethod;
  final String promoCode;
  final List<AddressSuggestion> searchResults;
  final bool isSearchingAddresses;
  final bool isSearchingSender;
  final bool isResolvingMapAddress;
  final String? createdOrderId;
  final String? errorMessage;

  DeliveryOrderState copyWith({
    DeliveryOrderStage? stage,
    Object? fromAddress = _unset,
    Object? toAddress = _unset,
    String? fromInput,
    String? toInput,
    Object? routeInfo = _unset,
    String? packageDescription,
    Object? packagePhotoPath = _unset,
    bool? isFragile,
    bool? requiresReturn,
    Object? declaredValue = _unset,
    Object? cashOnDelivery = _unset,
    String? contactName,
    String? contactPhone,
    List<DeliveryEstimate>? estimates,
    Object? selectedEstimate = _unset,
    DeliveryPaymentMethod? paymentMethod,
    String? promoCode,
    List<AddressSuggestion>? searchResults,
    bool? isSearchingAddresses,
    bool? isSearchingSender,
    bool? isResolvingMapAddress,
    Object? createdOrderId = _unset,
    Object? errorMessage = _unset,
  }) {
    return DeliveryOrderState(
      stage: stage ?? this.stage,
      fromAddress: fromAddress == _unset
          ? this.fromAddress
          : fromAddress as AddressSuggestion?,
      toAddress: toAddress == _unset
          ? this.toAddress
          : toAddress as AddressSuggestion?,
      fromInput: fromInput ?? this.fromInput,
      toInput: toInput ?? this.toInput,
      routeInfo: routeInfo == _unset
          ? this.routeInfo
          : routeInfo as DeliveryRouteInfo?,
      packageDescription: packageDescription ?? this.packageDescription,
      packagePhotoPath: packagePhotoPath == _unset
          ? this.packagePhotoPath
          : packagePhotoPath as String?,
      isFragile: isFragile ?? this.isFragile,
      requiresReturn: requiresReturn ?? this.requiresReturn,
      declaredValue: declaredValue == _unset
          ? this.declaredValue
          : declaredValue as double?,
      cashOnDelivery: cashOnDelivery == _unset
          ? this.cashOnDelivery
          : cashOnDelivery as double?,
      contactName: contactName ?? this.contactName,
      contactPhone: contactPhone ?? this.contactPhone,
      estimates: estimates ?? this.estimates,
      selectedEstimate: selectedEstimate == _unset
          ? this.selectedEstimate
          : selectedEstimate as DeliveryEstimate?,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      promoCode: promoCode ?? this.promoCode,
      searchResults: searchResults ?? this.searchResults,
      isSearchingAddresses: isSearchingAddresses ?? this.isSearchingAddresses,
      isSearchingSender: isSearchingSender ?? this.isSearchingSender,
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
    fromAddress,
    toAddress,
    fromInput,
    toInput,
    routeInfo,
    packageDescription,
    packagePhotoPath,
    isFragile,
    requiresReturn,
    declaredValue,
    cashOnDelivery,
    contactName,
    contactPhone,
    estimates,
    selectedEstimate,
    paymentMethod,
    promoCode,
    searchResults,
    isSearchingAddresses,
    isSearchingSender,
    isResolvingMapAddress,
    createdOrderId,
    errorMessage,
  ];
}
