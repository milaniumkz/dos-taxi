import 'dart:async';

import 'package:flutter/material.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/di/service_locator.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/app_formatters.dart';

class OrderChatArgs {
  const OrderChatArgs({
    required this.orderId,
    required this.isExecutor,
    required this.isClosed,
  });

  final String orderId;
  final bool isExecutor;
  final bool isClosed;
}

class OrderChatScreen extends StatefulWidget {
  const OrderChatScreen({required this.args, super.key});

  static const routePath = '/order-chat';

  final OrderChatArgs args;

  @override
  State<OrderChatScreen> createState() => _OrderChatScreenState();
}

class _OrderChatScreenState extends State<OrderChatScreen> {
  final _messageController = TextEditingController();
  final _messages = <_OrderChatMessage>[];
  final _apiClient = serviceLocator<ApiClient>();
  Timer? _pollTimer;
  bool _isLoading = true;
  bool _isSending = false;

  @override
  void initState() {
    super.initState();
    unawaited(_loadMessages());
    if (!widget.args.isClosed) {
      _pollTimer = Timer.periodic(const Duration(seconds: 2), (_) {
        unawaited(_loadMessages(silent: true));
      });
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _messageController.dispose();
    super.dispose();
  }

  String get _basePath => widget.args.isExecutor
      ? '/executor/orders/${widget.args.orderId}/messages'
      : '/orders/${widget.args.orderId}/messages';

  String get _currentSender => widget.args.isExecutor ? 'executor' : 'client';

  Future<void> _loadMessages({bool silent = false}) async {
    if (widget.args.orderId.isEmpty) {
      if (!silent) {
        setState(() => _isLoading = false);
      }
      return;
    }

    if (!silent) {
      setState(() => _isLoading = true);
    }

    try {
      final response = await _apiClient.guard(
        () => _apiClient.dio.get<List<dynamic>>(_basePath),
      );
      final items = (response.data ?? const <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .map(_OrderChatMessage.fromJson)
          .toList(growable: false);
      if (!mounted) {
        return;
      }
      setState(() {
        _messages
          ..clear()
          ..addAll(items);
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted || silent) {
        return;
      }
      setState(() => _isLoading = false);
      _showSnack(AppLocalizations.of(context)!.orderChatLoadFailed);
    }
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty ||
        widget.args.orderId.isEmpty ||
        widget.args.isClosed ||
        _isSending) {
      return;
    }

    setState(() => _isSending = true);
    _messageController.clear();

    try {
      final response = await _apiClient.guard(
        () => _apiClient.dio.post<Map<String, dynamic>>(
          _basePath,
          data: {'body': text},
        ),
      );
      final saved = _OrderChatMessage.fromJson(
        response.data ?? <String, dynamic>{},
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _messages.add(saved);
        _isSending = false;
      });
      unawaited(_loadMessages(silent: true));
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() => _isSending = false);
      _showSnack(AppLocalizations.of(context)!.orderChatSendFailed);
    }
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.orderChatTitle)),
      body: SafeArea(
        child: Column(
          children: [
            if (widget.args.isClosed)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.all(AppSpacing.md),
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.surfaceAlt,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  l10n.orderChatClosed,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _messages.isEmpty
                  ? _EmptyChat(label: l10n.orderChatEmpty)
                  : ListView.builder(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) => _OrderChatBubble(
                        message: _messages[index],
                        isMine: _messages[index].sender == _currentSender,
                      ),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      enabled: !widget.args.isClosed && !_isSending,
                      minLines: 1,
                      maxLines: 4,
                      decoration: InputDecoration(
                        hintText: widget.args.isClosed
                            ? l10n.orderChatClosed
                            : l10n.orderChatInputHint,
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  IconButton.filled(
                    onPressed: widget.args.isClosed || _isSending
                        ? null
                        : _sendMessage,
                    icon: _isSending
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send_rounded),
                    tooltip: l10n.orderChatSendAction,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OrderChatBubble extends StatelessWidget {
  const _OrderChatBubble({required this.message, required this.isMine});

  final _OrderChatMessage message;
  final bool isMine;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 280),
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: isMine ? AppColors.primary : AppColors.surfaceAlt,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              message.body,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: isMine ? AppColors.text : AppColors.text,
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              AppFormatters.formatTime(context, message.createdAt),
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.muted,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyChat extends StatelessWidget {
  const _EmptyChat({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: Theme.of(
            context,
          ).textTheme.bodyLarge?.copyWith(color: AppColors.muted),
        ),
      ),
    );
  }
}

class _OrderChatMessage {
  const _OrderChatMessage({
    required this.id,
    required this.sender,
    required this.body,
    required this.createdAt,
  });

  final String id;
  final String sender;
  final String body;
  final DateTime createdAt;

  factory _OrderChatMessage.fromJson(Map<String, dynamic> json) {
    return _OrderChatMessage(
      id: json['id'] as String? ?? '',
      sender: json['sender'] as String? ?? 'client',
      body: json['body'] as String? ?? '',
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
    );
  }
}
