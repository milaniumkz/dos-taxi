import 'package:equatable/equatable.dart';
import 'package:latlong2/latlong.dart';

import 'incoming_executor_offer.dart';

class ExecutorActiveOrderSession extends Equatable {
  const ExecutorActiveOrderSession({
    required this.orderId,
    required this.serviceType,
    required this.status,
    required this.currency,
    required this.paymentMethod,
    required this.price,
    required this.pickupAddress,
    required this.pickupLocation,
    required this.destinationAddress,
    required this.destinationLocation,
    this.distanceMeters,
    this.durationSeconds,
    this.clientName,
    this.clientPhone,
    this.proofPhotoPath,
    this.recipientCode,
  });

  factory ExecutorActiveOrderSession.fromOffer(IncomingExecutorOffer offer) {
    return ExecutorActiveOrderSession(
      orderId: offer.orderId,
      serviceType: offer.serviceType,
      status: 'accepted',
      currency: offer.currency,
      paymentMethod: offer.paymentMethod,
      price: offer.price,
      pickupAddress: offer.pickupAddress,
      pickupLocation: offer.pickupLocation,
      destinationAddress: offer.destinationAddress,
      destinationLocation: offer.destinationLocation,
      distanceMeters: offer.distanceMeters,
      durationSeconds: offer.durationSeconds,
      clientName: offer.clientName,
      clientPhone: offer.clientPhone,
    );
  }

  final String orderId;
  final String serviceType;
  final String status;
  final String currency;
  final String paymentMethod;
  final double price;
  final String pickupAddress;
  final LatLng pickupLocation;
  final String destinationAddress;
  final LatLng destinationLocation;
  final int? distanceMeters;
  final int? durationSeconds;
  final String? clientName;
  final String? clientPhone;
  final String? proofPhotoPath;
  final String? recipientCode;

  bool get isDelivery => serviceType == 'delivery';

  ExecutorActiveOrderSession copyWith({
    String? status,
    Object? clientName = _unset,
    Object? clientPhone = _unset,
    Object? proofPhotoPath = _unset,
    Object? recipientCode = _unset,
  }) {
    return ExecutorActiveOrderSession(
      orderId: orderId,
      serviceType: serviceType,
      status: status ?? this.status,
      currency: currency,
      paymentMethod: paymentMethod,
      price: price,
      pickupAddress: pickupAddress,
      pickupLocation: pickupLocation,
      destinationAddress: destinationAddress,
      destinationLocation: destinationLocation,
      distanceMeters: distanceMeters,
      durationSeconds: durationSeconds,
      clientName: clientName == _unset
          ? this.clientName
          : clientName as String?,
      clientPhone: clientPhone == _unset
          ? this.clientPhone
          : clientPhone as String?,
      proofPhotoPath: proofPhotoPath == _unset
          ? this.proofPhotoPath
          : proofPhotoPath as String?,
      recipientCode: recipientCode == _unset
          ? this.recipientCode
          : recipientCode as String?,
    );
  }

  @override
  List<Object?> get props => [
    orderId,
    serviceType,
    status,
    currency,
    paymentMethod,
    price,
    pickupAddress,
    pickupLocation,
    destinationAddress,
    destinationLocation,
    distanceMeters,
    durationSeconds,
    clientName,
    clientPhone,
    proofPhotoPath,
    recipientCode,
  ];
}

const _unset = Object();
