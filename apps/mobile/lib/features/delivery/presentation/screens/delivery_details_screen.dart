import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/errors/error_message_localizer.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/app_formatters.dart';
import '../cubit/delivery_order_cubit.dart';
import 'delivery_vehicle_screen.dart';

class DeliveryDetailsScreen extends StatefulWidget {
  const DeliveryDetailsScreen({super.key});

  static const routePath = '/delivery/details';

  @override
  State<DeliveryDetailsScreen> createState() => _DeliveryDetailsScreenState();
}

class _DeliveryDetailsScreenState extends State<DeliveryDetailsScreen> {
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _declaredValueController =
      TextEditingController();
  final TextEditingController _cashOnDeliveryController =
      TextEditingController();
  final TextEditingController _contactNameController = TextEditingController();
  final TextEditingController _contactPhoneController = TextEditingController();

  String? _photoPath;
  bool _isFragile = false;
  bool _requiresReturn = false;

  @override
  void initState() {
    super.initState();
    final state = context.read<DeliveryOrderCubit>().state;
    _descriptionController.text = state.packageDescription;
    _declaredValueController.text = state.declaredValue?.toString() ?? '';
    _cashOnDeliveryController.text = state.cashOnDelivery?.toString() ?? '';
    _contactNameController.text = state.contactName;
    _contactPhoneController.text = state.contactPhone.isEmpty
        ? ''
        : AppFormatters.formatKazakhstanPhone(state.contactPhone);
    _photoPath = state.packagePhotoPath;
    _isFragile = state.isFragile;
    _requiresReturn = state.requiresReturn;
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _declaredValueController.dispose();
    _cashOnDeliveryController.dispose();
    _contactNameController.dispose();
    _contactPhoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return BlocListener<DeliveryOrderCubit, DeliveryOrderState>(
      listener: (context, state) {
        final message = _resolveError(l10n, state.errorMessage);
        if (message != null && message.isNotEmpty) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text(message)));
        }
      },
      child: Scaffold(
        appBar: AppBar(title: Text(l10n.deliveryDetailsTitle)),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Column(
                    children: [
                      TextField(
                        controller: _descriptionController,
                        minLines: 3,
                        maxLines: 4,
                        decoration: InputDecoration(
                          labelText: l10n.deliveryDetailsDescriptionLabel,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      TextField(
                        controller: _declaredValueController,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        decoration: InputDecoration(
                          labelText: l10n.deliveryDetailsDeclaredValueLabel,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      TextField(
                        controller: _contactNameController,
                        decoration: InputDecoration(
                          labelText: l10n.deliveryDetailsRecipientNameLabel,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      TextField(
                        controller: _contactPhoneController,
                        keyboardType: TextInputType.phone,
                        inputFormatters: const [
                          KazakhstanPhoneInputFormatter(),
                        ],
                        decoration: InputDecoration(
                          labelText: l10n.deliveryDetailsRecipientPhoneLabel,
                          hintText: l10n.authPhoneFieldHint,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      SwitchListTile.adaptive(
                        value: _isFragile,
                        onChanged: (value) =>
                            setState(() => _isFragile = value),
                        title: Text(l10n.deliveryDetailsFragile),
                        contentPadding: EdgeInsets.zero,
                      ),
                      SwitchListTile.adaptive(
                        value: _requiresReturn,
                        onChanged: (value) =>
                            setState(() => _requiresReturn = value),
                        title: Text(l10n.deliveryDetailsReturn),
                        contentPadding: EdgeInsets.zero,
                      ),
                      SwitchListTile.adaptive(
                        value: _cashOnDeliveryController.text.trim().isNotEmpty,
                        onChanged: (value) {
                          setState(() {
                            if (!value) {
                              _cashOnDeliveryController.clear();
                            }
                          });
                        },
                        title: Text(l10n.deliveryDetailsCashOnDelivery),
                        contentPadding: EdgeInsets.zero,
                      ),
                      TextField(
                        controller: _cashOnDeliveryController,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        decoration: InputDecoration(
                          labelText: l10n.deliveryDetailsCashOnDeliveryLabel,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      OutlinedButton.icon(
                        onPressed: _pickImage,
                        icon: const Icon(Icons.photo_camera_back_outlined),
                        label: Text(l10n.deliveryDetailsPhotoAction),
                      ),
                      if (_photoPath != null) ...[
                        const SizedBox(height: AppSpacing.md),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(20),
                          child: Image.file(
                            File(_photoPath!),
                            height: 180,
                            width: double.infinity,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _saveAndContinue,
                  child: Text(l10n.deliveryDetailsContinue),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery);
    if (!mounted || file == null) {
      return;
    }

    setState(() {
      _photoPath = file.path;
    });
  }

  Future<void> _saveAndContinue() async {
    final cubit = context.read<DeliveryOrderCubit>();
    final success = await cubit.saveDetails(
      packageDescription: _descriptionController.text,
      contactName: _contactNameController.text,
      contactPhone: AppFormatters.normalizeKazakhstanPhone(
        _contactPhoneController.text,
      ),
      packagePhotoPath: _photoPath,
      declaredValue: _parseDouble(_declaredValueController.text),
      cashOnDelivery: _parseDouble(_cashOnDeliveryController.text),
      isFragile: _isFragile,
      requiresReturn: _requiresReturn,
    );

    if (success && mounted) {
      context.push(DeliveryVehicleScreen.routePath);
    }
  }

  double? _parseDouble(String value) {
    final normalized = value.replaceAll(',', '.').trim();
    if (normalized.isEmpty) {
      return null;
    }

    return double.tryParse(normalized);
  }

  String? _resolveError(AppLocalizations l10n, String? codeOrMessage) {
    switch (codeOrMessage) {
      case 'DELIVERY_DESCRIPTION_REQUIRED':
        return l10n.deliveryErrorDescription;
      case 'DELIVERY_RECIPIENT_NAME_REQUIRED':
        return l10n.deliveryErrorRecipientName;
      case 'DELIVERY_RECIPIENT_PHONE_REQUIRED':
        return l10n.deliveryErrorRecipientPhone;
      default:
        return ErrorMessageLocalizer.resolve(l10n, codeOrMessage);
    }
  }
}
