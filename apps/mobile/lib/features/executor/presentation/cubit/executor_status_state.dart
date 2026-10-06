part of 'executor_status_cubit.dart';

enum ExecutorScreenStage { loading, onboarding, verificationPending, dashboard }

class ExecutorStatusState extends Equatable {
  const ExecutorStatusState({
    required this.stage,
    required this.currentLocation,
    this.profile,
    this.isLoading = false,
    this.isSubmittingOnboarding = false,
    this.isUpdatingOnline = false,
    this.isLocating = false,
    this.recenterRequestId = 0,
    this.demoDashboardEnabled = false,
    this.lastPresenceAt,
    this.errorMessage,
  });

  final ExecutorScreenStage stage;
  final ExecutorProfile? profile;
  final LatLng currentLocation;
  final bool isLoading;
  final bool isSubmittingOnboarding;
  final bool isUpdatingOnline;
  final bool isLocating;
  final int recenterRequestId;
  final bool demoDashboardEnabled;
  final DateTime? lastPresenceAt;
  final String? errorMessage;

  bool get canUseDemoDashboard =>
      !demoDashboardEnabled &&
      profile != null &&
      profile!.verificationStatus == 'pending';

  ExecutorStatusState copyWith({
    ExecutorScreenStage? stage,
    Object? profile = _unset,
    LatLng? currentLocation,
    bool? isLoading,
    bool? isSubmittingOnboarding,
    bool? isUpdatingOnline,
    bool? isLocating,
    int? recenterRequestId,
    bool? demoDashboardEnabled,
    Object? lastPresenceAt = _unset,
    Object? errorMessage = _unset,
  }) {
    return ExecutorStatusState(
      stage: stage ?? this.stage,
      profile: profile == _unset ? this.profile : profile as ExecutorProfile?,
      currentLocation: currentLocation ?? this.currentLocation,
      isLoading: isLoading ?? this.isLoading,
      isSubmittingOnboarding:
          isSubmittingOnboarding ?? this.isSubmittingOnboarding,
      isUpdatingOnline: isUpdatingOnline ?? this.isUpdatingOnline,
      isLocating: isLocating ?? this.isLocating,
      recenterRequestId: recenterRequestId ?? this.recenterRequestId,
      demoDashboardEnabled: demoDashboardEnabled ?? this.demoDashboardEnabled,
      lastPresenceAt: lastPresenceAt == _unset
          ? this.lastPresenceAt
          : lastPresenceAt as DateTime?,
      errorMessage: errorMessage == _unset
          ? this.errorMessage
          : errorMessage as String?,
    );
  }

  @override
  List<Object?> get props => [
    stage,
    profile,
    currentLocation,
    isLoading,
    isSubmittingOnboarding,
    isUpdatingOnline,
    isLocating,
    recenterRequestId,
    demoDashboardEnabled,
    lastPresenceAt,
    errorMessage,
  ];
}

const _unset = Object();
