import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/errors/error_message_localizer.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../shared/map/order_route_map.dart';
import '../../../home/domain/entities/address_suggestion.dart';
import '../cubit/delivery_order_cubit.dart';
import 'delivery_details_screen.dart';

enum _DeliveryAddressPoint { from, to }

class DeliveryAddressScreen extends StatefulWidget {
  const DeliveryAddressScreen({super.key});

  static const routePath = '/delivery/address';

  @override
  State<DeliveryAddressScreen> createState() => _DeliveryAddressScreenState();
}

class _DeliveryAddressScreenState extends State<DeliveryAddressScreen> {
  final TextEditingController _fromController = TextEditingController();
  final TextEditingController _toController = TextEditingController();
  _DeliveryAddressPoint _activePoint = _DeliveryAddressPoint.to;
  bool _didSyncInitialLabels = false;

  @override
  void initState() {
    super.initState();
    final state = context.read<DeliveryOrderCubit>().state;
    _fromController.text = state.fromInput;
    _toController.text = state.toInput;
    _activePoint = state.fromAddress == null
        ? _DeliveryAddressPoint.from
        : _DeliveryAddressPoint.to;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_didSyncInitialLabels) {
      return;
    }

    final l10n = AppLocalizations.of(context)!;
    final state = context.read<DeliveryOrderCubit>().state;
    _syncController(
      _fromController,
      _inputText(l10n, state.fromInput, state.fromAddress),
    );
    _syncController(
      _toController,
      _inputText(l10n, state.toInput, state.toAddress),
    );
    _didSyncInitialLabels = true;
  }

  @override
  void dispose() {
    _fromController.dispose();
    _toController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return BlocConsumer<DeliveryOrderCubit, DeliveryOrderState>(
      listener: (context, state) {
        _syncController(
          _fromController,
          _inputText(l10n, state.fromInput, state.fromAddress),
        );
        _syncController(
          _toController,
          _inputText(l10n, state.toInput, state.toAddress),
        );
        final message = _resolveError(l10n, state.errorMessage);
        if (message != null && message.isNotEmpty) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text(message)));
        }
      },
      builder: (context, state) {
        final cubit = context.read<DeliveryOrderCubit>();
        final routePoints = <LatLng>[
          if (state.fromAddress != null) state.fromAddress!.location,
          if (state.toAddress != null) state.toAddress!.location,
        ];
        final activeLocation = _activePoint == _DeliveryAddressPoint.from
            ? state.fromAddress?.location
            : state.toAddress?.location;
        return Scaffold(
          appBar: AppBar(title: Text(l10n.deliveryAddressTitle)),
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(28),
                      child: OrderRouteMap(
                        key: ValueKey(
                          '${state.fromAddress}-${state.toAddress}-'
                          '$_activePoint',
                        ),
                        pickup: state.fromAddress?.location,
                        destination: state.toAddress?.location,
                        routePoints: routePoints.length == 2
                            ? routePoints
                            : const [],
                        center: activeLocation,
                        isLoading: state.isResolvingMapAddress,
                        onTap: (point) {
                          final fallbackTitle = l10n.addressPickerSelectedOnMap;
                          if (_activePoint == _DeliveryAddressPoint.from) {
                            cubit.setFromAddressFromMap(
                              location: point,
                              fallbackTitle: fallbackTitle,
                            );
                            return;
                          }
                          cubit.setToAddressFromMap(
                            location: point,
                            fallbackTitle: fallbackTitle,
                          );
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    _activePoint == _DeliveryAddressPoint.from
                        ? l10n.addressPickerPickupMapHint
                        : l10n.addressPickerDestinationMapHint,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      child: Column(
                        children: [
                          TextField(
                            controller: _fromController,
                            textInputAction: TextInputAction.search,
                            onTap: () {
                              setState(
                                () => _activePoint = _DeliveryAddressPoint.from,
                              );
                              cubit.activateFromInput();
                            },
                            onChanged: (value) {
                              setState(
                                () => _activePoint = _DeliveryAddressPoint.from,
                              );
                              cubit.searchFromQuery(value);
                            },
                            onSubmitted: cubit.submitFromQuery,
                            decoration: InputDecoration(
                              labelText: l10n.deliveryAddressFromLabel,
                              hintText: l10n.deliveryAddressHint,
                              prefixIcon: Icon(
                                Icons.trip_origin_rounded,
                                color:
                                    _activePoint == _DeliveryAddressPoint.from
                                    ? Colors.green
                                    : null,
                              ),
                              suffixIcon: _AddressFieldActions(
                                hasValue:
                                    _fromController.text.trim().isNotEmpty ||
                                    state.fromAddress != null,
                                onClear: cubit.clearFromAddress,
                                onSearch: () =>
                                    cubit.submitFromQuery(_fromController.text),
                              ),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          TextField(
                            controller: _toController,
                            textInputAction: TextInputAction.search,
                            onTap: () {
                              setState(
                                () => _activePoint = _DeliveryAddressPoint.to,
                              );
                              cubit.activateToInput();
                            },
                            onChanged: (value) {
                              setState(
                                () => _activePoint = _DeliveryAddressPoint.to,
                              );
                              cubit.searchToQuery(value);
                            },
                            onSubmitted: cubit.submitToQuery,
                            decoration: InputDecoration(
                              labelText: l10n.deliveryAddressToLabel,
                              hintText: l10n.deliveryAddressHint,
                              prefixIcon: Icon(
                                Icons.location_on_rounded,
                                color: _activePoint == _DeliveryAddressPoint.to
                                    ? Colors.red
                                    : null,
                              ),
                              suffixIcon: _AddressFieldActions(
                                hasValue:
                                    _toController.text.trim().isNotEmpty ||
                                    state.toAddress != null,
                                onClear: cubit.clearToAddress,
                                onSearch: () =>
                                    cubit.submitToQuery(_toController.text),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (state.searchResults.isNotEmpty ||
                      state.isSearchingAddresses)
                    Padding(
                      padding: const EdgeInsets.only(top: AppSpacing.sm),
                      child: Card(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxHeight: 240),
                          child: state.isSearchingAddresses
                              ? const Center(
                                  child: Padding(
                                    padding: EdgeInsets.all(AppSpacing.lg),
                                    child: CircularProgressIndicator(),
                                  ),
                                )
                              : ListView.separated(
                                  shrinkWrap: true,
                                  itemCount: state.searchResults.length,
                                  separatorBuilder: (context, _) =>
                                      const Divider(height: 1),
                                  itemBuilder: (context, index) {
                                    final suggestion =
                                        state.searchResults[index];
                                    return ListTile(
                                      title: Text(suggestion.displayTitle),
                                      subtitle: Text(suggestion.subtitle),
                                      onTap: () {
                                        if (_activePoint ==
                                            _DeliveryAddressPoint.from) {
                                          cubit.setFromAddress(suggestion);
                                          setState(
                                            () => _activePoint =
                                                _DeliveryAddressPoint.to,
                                          );
                                          return;
                                        }
                                        cubit.setToAddress(suggestion);
                                      },
                                    );
                                  },
                                ),
                        ),
                      ),
                    ),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    l10n.deliveryAddressHelper,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const Spacer(),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: state.isResolvingMapAddress
                          ? null
                          : () {
                              if (cubit.proceedToDetails()) {
                                context.push(DeliveryDetailsScreen.routePath);
                              }
                            },
                      child: Text(l10n.deliveryAddressContinue),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  void _syncController(TextEditingController controller, String text) {
    if (controller.text == text) {
      return;
    }
    controller.value = TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }

  String _inputText(
    AppLocalizations l10n,
    String rawInput,
    AddressSuggestion? address,
  ) {
    if (rawInput.trim().isNotEmpty) {
      return rawInput;
    }
    return _displayLabel(l10n, address);
  }

  String _displayLabel(AppLocalizations l10n, AddressSuggestion? address) {
    if (address == null) {
      return '';
    }

    final title = address.displayTitle;
    if (title.isNotEmpty) {
      return title;
    }

    return l10n.commonCurrentLocation;
  }

  String? _resolveError(AppLocalizations l10n, String? codeOrMessage) {
    if (codeOrMessage == null || codeOrMessage.trim().isEmpty) return null;
    final configured = ErrorMessageLocalizer.configured(l10n, codeOrMessage);
    if (configured != null) return configured;
    switch (codeOrMessage) {
      case 'DELIVERY_ADDRESSES_REQUIRED':
        return l10n.deliveryErrorAddresses;
      case 'ORDER_ADDRESS_NOT_FOUND':
        return l10n.addressPickerAddressNotFound;
      case 'DELIVERY_ADDRESS_SEARCH_FAILED':
        return l10n.addressPickerAddressSearchFailed;
      case 'DELIVERY_REVERSE_GEOCODE_FAILED':
        return l10n.homeReverseGeocodeFailed;
      default:
        return ErrorMessageLocalizer.resolve(l10n, codeOrMessage);
    }
  }
}

class _AddressFieldActions extends StatelessWidget {
  const _AddressFieldActions({
    required this.hasValue,
    required this.onClear,
    required this.onSearch,
  });

  final bool hasValue;
  final VoidCallback onClear;
  final VoidCallback onSearch;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (hasValue)
          IconButton(
            tooltip: AppLocalizations.of(context)!.addressPickerClearPoint,
            icon: const Icon(Icons.close_rounded),
            onPressed: onClear,
          ),
        IconButton(icon: const Icon(Icons.search_rounded), onPressed: onSearch),
      ],
    );
  }
}
