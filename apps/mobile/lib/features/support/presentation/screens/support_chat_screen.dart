import 'package:flutter/material.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/di/service_locator.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/app_formatters.dart';

class SupportChatScreen extends StatefulWidget {
  const SupportChatScreen({super.key});

  static const routePath = '/support';

  @override
  State<SupportChatScreen> createState() => _SupportChatScreenState();
}

class _SupportChatScreenState extends State<SupportChatScreen> {
  final _messageController = TextEditingController();
  final _messages = <_SupportChatMessage>[];
  bool _isLoading = true;
  bool _isSending = false;

  ApiClient get _apiClient => serviceLocator<ApiClient>();

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    setState(() => _isLoading = true);
    try {
      final response = await _apiClient.guard(
        () => _apiClient.dio.get<List<dynamic>>('/support/messages'),
      );
      final messages = (response.data ?? const <dynamic>[])
          .whereType<Map<String, dynamic>>()
          .map(_SupportChatMessage.fromJson)
          .toList(growable: false);
      if (!mounted) {
        return;
      }
      setState(() {
        _messages
          ..clear()
          ..addAll(messages);
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Не удалось загрузить чат поддержки')),
      );
    }
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _isSending) {
      return;
    }

    _messageController.clear();
    final optimisticMessage = _SupportChatMessage(
      id: 'local-${DateTime.now().microsecondsSinceEpoch}',
      body: text,
      sender: _SupportSender.user,
      createdAt: DateTime.now(),
    );
    setState(() {
      _isSending = true;
      _messages.add(optimisticMessage);
    });

    try {
      final response = await _apiClient.guard(
        () => _apiClient.dio.post<Map<String, dynamic>>(
          '/support/messages',
          data: {'body': text},
        ),
      );
      final savedMessage = _SupportChatMessage.fromJson(
        response.data ?? <String, dynamic>{},
      );
      if (!mounted) {
        return;
      }
      setState(() {
        final index = _messages.indexWhere(
          (message) => message.id == optimisticMessage.id,
        );
        if (index >= 0) {
          _messages[index] = savedMessage;
        }
        _isSending = false;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() => _isSending = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Сообщение не отправлено')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: Text(l10n.commonSupport)),
      body: SafeArea(
        child: Column(
          children: [
            Container(
              width: double.infinity,
              margin: const EdgeInsets.all(AppSpacing.md),
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppColors.primary),
              ),
              child: Text(
                'Оператор ответит здесь. Телефон поддержки: '
                '${l10n.driverProfileSupportPhoneValue}',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _messages.isEmpty
                  ? const _SupportEmptyState()
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(
                        AppSpacing.md,
                        0,
                        AppSpacing.md,
                        AppSpacing.md,
                      ),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) {
                        return _SupportBubble(message: _messages[index]);
                      },
                    ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.md,
                AppSpacing.sm,
                AppSpacing.md,
                AppSpacing.md,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _sendMessage(),
                      decoration: InputDecoration(
                        hintText: 'Напишите сообщение оператору',
                        filled: true,
                        fillColor: AppColors.surface,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(18),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  FilledButton(
                    onPressed: _isSending ? null : _sendMessage,
                    child: _isSending
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send_rounded),
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

class _SupportEmptyState extends StatelessWidget {
  const _SupportEmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.support_agent_rounded, size: 48),
            const SizedBox(height: AppSpacing.md),
            Text(
              'Напишите первое сообщение',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'Обращение появится у администратора в админ-панели.',
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _SupportBubble extends StatelessWidget {
  const _SupportBubble({required this.message});

  final _SupportChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isUser = message.sender == _SupportSender.user;
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 300),
        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: isUser ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isUser ? 'Вы' : 'Поддержка',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                color: isUser ? AppColors.text : AppColors.muted,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 4),
            Text(message.body),
            const SizedBox(height: 4),
            Text(
              AppFormatters.formatTime(context, message.createdAt),
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: isUser ? AppColors.text : AppColors.muted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

enum _SupportSender { user, operator }

class _SupportChatMessage {
  const _SupportChatMessage({
    required this.id,
    required this.body,
    required this.sender,
    required this.createdAt,
  });

  final String id;
  final String body;
  final _SupportSender sender;
  final DateTime createdAt;

  factory _SupportChatMessage.fromJson(Map<String, dynamic> json) {
    final sender = json['sender'] == 'operator'
        ? _SupportSender.operator
        : _SupportSender.user;
    return _SupportChatMessage(
      id: json['id'] as String? ?? '',
      body: json['body'] as String? ?? '',
      sender: sender,
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
    );
  }
}
