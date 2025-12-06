/**
 * Server-side notification translations.
 * Each notification contains all language variants, sent to clients who pick their locale.
 * Supports ICU MessageFormat placeholders like {time} for dynamic content.
 */

import { LocalizedStrings } from '../../shared/languages.js';

export interface NotificationDefinition {
  title: LocalizedStrings;
  body: LocalizedStrings;
  label: LocalizedStrings;
  icon?: string;
}

/**
 * Predefined notification templates with translations in all supported languages.
 * Use createLocalizedNotification() to build payloads from these definitions.
 */
export const NOTIFICATIONS: Record<string, NotificationDefinition> = {
  welcome: {
    title: {
      'en-US': 'Welcome!',
      'en-GB': 'Welcome!',
      'de': 'Willkommen!',
      'fr': 'Bienvenue !',
      'es': '¡Bienvenido!',
      'zh-CN': '欢迎！',
      'zh-TW': '歡迎！',
      'sv-SE': 'Velcume-a! Bork bork bork!',
    },
    body: {
      'en-US': 'Thanks for trying Angular Momentum—your modern Angular starter kit!',
      'en-GB': 'Thanks for trying Angular Momentum—your modern Angular starter kit!',
      'de': 'Danke, dass Sie Angular Momentum ausprobieren—Ihr modernes Angular-Starter-Kit!',
      'fr': 'Merci d’essayer Angular Momentum—votre kit de démarrage Angular moderne !',
      'es': '¡Gracias por probar Angular Momentum, tu kit de inicio moderno para Angular!',
      'zh-CN': '感谢您试用Angular Momentum—您的现代Angular入门套件！',
      'zh-TW': '感謝您試用Angular Momentum—您的現代Angular入門套件！',
      'sv-SE': 'Thunks fur tryeeng Ungooler Moomentoom—yuoor muddern Ungooler sterter keet! Bork!',
    },
    label: {
      'en-US': 'Welcome Message',
      'en-GB': 'Welcome Message',
      'de': 'Willkommensnachricht',
      'fr': 'Message de Bienvenue',
      'es': 'Mensaje de Bienvenida',
      'zh-CN': '欢迎消息',
      'zh-TW': '歡迎訊息',
      'sv-SE': 'Velcume-a Messege-a',
    },
  },
  feature_update: {
    title: {
      'en-US': 'New Feature Available',
      'en-GB': 'New Feature Available',
      'de': 'Neue Funktion Verfügbar',
      'fr': 'Nouvelle Fonctionnalité Disponible',
      'es': 'Nueva Función Disponible',
      'zh-CN': '新功能可用',
      'zh-TW': '新功能可用',
      'sv-SE': 'Noo Feetoore-a Efeeeleble-a',
    },
    body: {
      'en-US': 'Check out the latest updates in the Features section!',
      'en-GB': 'Check out the latest updates in the Features section!',
      'de': 'Schauen Sie sich die neuesten Updates im Funktionsbereich an!',
      'fr': 'Découvrez les dernières mises à jour dans la section Fonctionnalités !',
      'es': '¡Consulta las últimas actualizaciones en la sección de Funciones!',
      'zh-CN': '查看功能部分的最新更新！',
      'zh-TW': '查看功能部分的最新更新！',
      'sv-SE': 'Check oooot zee letest updetes in zee Feetoores secshun! Bork!',
    },
    label: {
      'en-US': 'Feature Update',
      'en-GB': 'Feature Update',
      'de': 'Funktionsaktualisierung',
      'fr': 'Mise à Jour de Fonctionnalité',
      'es': 'Actualización de Función',
      'zh-CN': '功能更新',
      'zh-TW': '功能更新',
      'sv-SE': 'Feetoore-a Updete-a',
    },
  },
  maintenance: {
    title: {
      'en-US': 'System Maintenance',
      'en-GB': 'System Maintenance',
      'de': 'Systemwartung',
      'fr': 'Maintenance du Système',
      'es': 'Mantenimiento del Sistema',
      'zh-CN': '系统维护',
      'zh-TW': '系統維護',
      'sv-SE': 'System Meentinunce-a',
    },
    body: {
      'en-US': 'Scheduled maintenance will occur tonight at {time}.',
      'en-GB': 'Scheduled maintenance will occur tonight at {time}.',
      'de': 'Die geplante Wartung findet heute Nacht um {time} statt.',
      'fr': 'La maintenance programmée aura lieu ce soir à {time}.',
      'es': 'El mantenimiento programado ocurrirá esta noche a las {time}.',
      'zh-CN': '计划维护将于今晚{time}进行。',
      'zh-TW': '計劃維護將於今晚{time}進行。',
      'sv-SE': 'Schedooled meentinunce-a veel ooccoor tuneegt et {time}. Bork!',
    },
    label: {
      'en-US': 'Maintenance Alert',
      'en-GB': 'Maintenance Alert',
      'de': 'Wartungshinweis',
      'fr': 'Alerte de Maintenance',
      'es': 'Alerta de Mantenimiento',
      'zh-CN': '维护警报',
      'zh-TW': '維護警報',
      'sv-SE': 'Meentinunce-a Elert',
    },
  },
  achievement: {
    title: {
      'en-US': 'Achievement Unlocked',
      'en-GB': 'Achievement Unlocked',
      'de': 'Erfolg Freigeschaltet',
      'fr': 'Succès Débloqué',
      'es': 'Logro Desbloqueado',
      'zh-CN': '成就解锁',
      'zh-TW': '成就解鎖',
      'sv-SE': 'Echeefement Unlucked! Bork bork!',
    },
    body: {
      'en-US': 'You successfully tested the notification system!',
      'en-GB': 'You successfully tested the notification system!',
      'de': 'Sie haben das Benachrichtigungssystem erfolgreich getestet!',
      'fr': 'Vous avez testé avec succès le système de notifications !',
      'es': '¡Probaste exitosamente el sistema de notificaciones!',
      'zh-CN': '您成功测试了通知系统！',
      'zh-TW': '您成功測試了通知系統！',
      'sv-SE': 'Yuoo soocccessffoollee tested zee nootifficesshun system! Bork bork bork!',
    },
    label: {
      'en-US': 'Achievement',
      'en-GB': 'Achievement',
      'de': 'Erfolg',
      'fr': 'Succès',
      'es': 'Logro',
      'zh-CN': '成就',
      'zh-TW': '成就',
      'sv-SE': 'Echeefement',
    },
  },
} as const;

export type NotificationId = keyof typeof NOTIFICATIONS;
