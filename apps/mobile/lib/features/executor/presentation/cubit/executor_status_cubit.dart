import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/config/app_config.dart';
import '../../../../core/errors/failure.dart';
import '../../../../core/location/location_service.dart';
import '../../domain/entities/executor_profile.dart';
import '../../domain/repositories/executor_repository.dart';

part 'executor_status_state.dart';

class ExecutorStatusCubit extends Cubit<ExecutorStatusState> {
  ExecutorStatusCubit({
    required ExecutorRepository executorRepository,
    required AppConfig config,
    required LocationService locationService,
  }) : _executorRepository = executorRepository,
       _config = config,
       _locationService = locationService,
       super(
         ExecutorStatusState(
           stage: ExecutorScreenStage.loading,
           currentLocation: _defaultLocation,
         ),
       );

  static final LatLng _defaultLocation = LatLng(43.238949, 76.889709);

  final ExecutorRepository _executorRepository;
  final AppConfig _config;
  final LocationService _locationService;
  Timer? _presenceTimer;
  int _presenceTick = 0;

  Future<void> initialize() async {
    emit(state.copyWith(isLoading: true, errorMessage: null));
    final result = await _executorRepository.fetchProfile();
    if (isClosed) {
      return;
    }

    await result.fold((failure) async => _emitFailure(failure), (
      profile,
    ) async {
      final location = await _resolveDeviceLocation();
      final nextStage = _resolveStage(profile);
      emit(
        state.copyWith(
          isLoading: false,
          profile: profile,
          stage: nextStage,
          currentLocation: location,
          errorMessage: null,
        ),
      );

      if (nextStage == ExecutorScreenStage.dashboard &&
          profile?.isOnline == true) {
        _startPresenceLoop();
      } else {
        _stopPresenceLoop();
      }
    });
  }

  Future<void> refreshVerification() => initialize();

  Future<void> centerOnCurrentLocation() async {
    final nextLocation = await _resolveFreshDeviceLocation();
    if (isClosed) {
      return;
    }

    if (nextLocation == null) {
      emit(state.copyWith(errorMessage: 'Не удалось определить геолокацию'));
      return;
    }

    emit(state.copyWith(currentLocation: nextLocation, errorMessage: null));
  }

  Future<void> submitOnboarding({
    required String name,
    required String executorType,
    String? vehicleType,
    String? vehicleMake,
    String? vehicleModel,
    int? vehicleYear,
    String? vehicleColor,
    String? vehiclePlate,
  }) async {
    emit(state.copyWith(isSubmittingOnboarding: true, errorMessage: null));
    final result = await _executorRepository.submitOnboarding(
      name: name,
      executorType: executorType,
      vehicleType: vehicleType,
      vehicleMake: vehicleMake,
      vehicleModel: vehicleModel,
      vehicleYear: vehicleYear,
      vehicleColor: vehicleColor,
      vehiclePlate: vehiclePlate,
    );
    if (isClosed) {
      return;
    }

    result.fold(_emitFailure, (profile) {
      emit(
        state.copyWith(
          isSubmittingOnboarding: false,
          profile: profile,
          stage: ExecutorScreenStage.verificationPending,
          demoDashboardEnabled: false,
          errorMessage: null,
        ),
      );
    });
  }

  Future<bool> updateVehicleSettings({
    String? vehicleMake,
    String? vehicleModel,
    int? vehicleYear,
    String? vehicleColor,
    String? vehiclePlate,
    required List<String> enabledTariffs,
  }) async {
    final profile = state.profile;
    if (profile == null) {
      return false;
    }

    emit(state.copyWith(isLoading: true, errorMessage: null));
    final result = await _executorRepository.updateVehicleSettings(
      profile: profile,
      vehicleMake: vehicleMake,
      vehicleModel: vehicleModel,
      vehicleYear: vehicleYear,
      vehicleColor: vehicleColor,
      vehiclePlate: vehiclePlate,
      enabledTariffs: enabledTariffs,
    );
    if (isClosed) {
      return false;
    }

    return result.fold(
      (failure) {
        _emitFailure(failure);
        return false;
      },
      (updatedProfile) {
        final nextStage = _resolveStage(updatedProfile);
        emit(
          state.copyWith(
            isLoading: false,
            profile: updatedProfile,
            stage: nextStage,
            demoDashboardEnabled: false,
            errorMessage: null,
          ),
        );
        if (updatedProfile.isOnline) {
          _startPresenceLoop();
        } else {
          _stopPresenceLoop();
        }
        return true;
      },
    );
  }

  Future<bool> updateDriverProfile({required String name}) async {
    final profile = state.profile;
    if (profile == null) {
      return false;
    }

    emit(state.copyWith(isLoading: true, errorMessage: null));
    final result = await _executorRepository.updateDriverProfile(
      profile: profile,
      name: name,
    );
    if (isClosed) {
      return false;
    }

    return result.fold(
      (failure) {
        _emitFailure(failure);
        return false;
      },
      (updatedProfile) {
        final nextStage = _resolveStage(updatedProfile);
        emit(
          state.copyWith(
            isLoading: false,
            profile: updatedProfile,
            stage: nextStage,
            demoDashboardEnabled: false,
            errorMessage: null,
          ),
        );
        if (updatedProfile.isOnline) {
          _startPresenceLoop();
        } else {
          _stopPresenceLoop();
        }
        return true;
      },
    );
  }

  void enableDemoDashboard() {
    if (_config.flavor == AppFlavor.prod || state.profile == null) {
      return;
    }

    emit(
      state.copyWith(
        demoDashboardEnabled: true,
        stage: ExecutorScreenStage.dashboard,
        errorMessage: null,
      ),
    );
  }

  Future<void> updateOnline(bool isOnline) async {
    final profile = state.profile;
    if (profile == null) {
      return;
    }

    emit(state.copyWith(isUpdatingOnline: true, errorMessage: null));
    final nextLocation = await _resolveFreshDeviceLocation();
    if (nextLocation == null) {
      if (!isClosed) {
        emit(
          state.copyWith(
            isUpdatingOnline: false,
            errorMessage: 'Не удалось определить геолокацию',
          ),
        );
      }
      return;
    }

    final result = await _executorRepository.updateOnlineStatus(
      profile: profile,
      isOnline: isOnline,
      location: nextLocation,
      heading: _buildHeading(),
    );
    if (isClosed) {
      return;
    }

    result.fold(_emitFailure, (updatedProfile) {
      emit(
        state.copyWith(
          isUpdatingOnline: false,
          profile: updatedProfile,
          currentLocation: nextLocation,
          lastPresenceAt: DateTime.now(),
          errorMessage: null,
        ),
      );

      if (updatedProfile.isOnline) {
        _startPresenceLoop();
      } else {
        _stopPresenceLoop();
      }
    });
  }

  Future<bool> requestBalanceTopUp({
    required double amount,
    required String phone,
  }) async {
    emit(state.copyWith(isLoading: true, errorMessage: null));
    final result = await _executorRepository.requestBalanceTopUp(
      amount: amount,
      phone: phone,
    );
    if (isClosed) {
      return false;
    }

    return result.fold(
      (failure) {
        _emitFailure(failure);
        return false;
      },
      (_) {
        emit(state.copyWith(isLoading: false, errorMessage: null));
        return true;
      },
    );
  }

  void resetLocalSession() {
    _stopPresenceLoop();
    emit(
      ExecutorStatusState(
        stage: ExecutorScreenStage.onboarding,
        currentLocation: _defaultLocation,
      ),
    );
  }

  @override
  Future<void> close() {
    _stopPresenceLoop();
    return super.close();
  }

  ExecutorScreenStage _resolveStage(ExecutorProfile? profile) {
    if (profile == null) {
      return ExecutorScreenStage.onboarding;
    }

    if (profile.isVerified || state.demoDashboardEnabled) {
      return ExecutorScreenStage.dashboard;
    }

    return ExecutorScreenStage.verificationPending;
  }

  void _startPresenceLoop() {
    _presenceTimer?.cancel();
    _presenceTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      unawaited(_sendPresenceHeartbeat());
    });
  }

  void _stopPresenceLoop() {
    _presenceTimer?.cancel();
    _presenceTimer = null;
  }

  Future<void> _sendPresenceHeartbeat() async {
    final profile = state.profile;
    if (profile == null ||
        !profile.isOnline ||
        state.stage != ExecutorScreenStage.dashboard) {
      return;
    }

    final nextLocation = await _resolveFreshDeviceLocation();
    if (nextLocation == null) {
      return;
    }

    final result = await _executorRepository.updateOnlineStatus(
      profile: profile,
      isOnline: true,
      location: nextLocation,
      heading: _buildHeading(),
    );
    if (isClosed) {
      return;
    }

    result.fold(
      (_) {
        emit(
          state.copyWith(
            currentLocation: nextLocation,
            lastPresenceAt: DateTime.now(),
          ),
        );
      },
      (updatedProfile) {
        emit(
          state.copyWith(
            profile: updatedProfile,
            currentLocation: nextLocation,
            lastPresenceAt: DateTime.now(),
            errorMessage: null,
          ),
        );
      },
    );
  }

  Future<LatLng> _resolveDeviceLocation() async {
    final result = await _locationService.currentLocation();
    return result.fold((_) => state.currentLocation, (location) => location);
  }

  Future<LatLng?> _resolveFreshDeviceLocation() async {
    final result = await _locationService.currentLocation();
    return result.fold((_) => null, (location) => location);
  }

  double _buildHeading() {
    _presenceTick += 1;
    return (_presenceTick * 27) % 360;
  }

  void _emitFailure(Failure failure) {
    emit(
      state.copyWith(
        isLoading: false,
        isSubmittingOnboarding: false,
        isUpdatingOnline: false,
        errorMessage: failure.message,
      ),
    );
  }
}
