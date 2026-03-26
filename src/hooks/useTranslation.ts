import { useIntl } from 'react-intl';

/**
 * Custom hook for translations using react-intl
 * Provides a simple interface for translating text throughout the application
 */
export const useTranslation = () => {
  const intl = useIntl();

  // Helper function to translate stage names
  const translateStage = (stageKey: string) => {
    const stageMap: Record<string, string> = {
      templating: 'STAGE.TEMPLATING',
      drafting: 'STAGE.DRAFTING',
      programming: 'STAGE.PROGRAMMING',
      final_programming: 'STAGE.FINAL_PROGRAMMING',
      sales_ct: 'STAGE.SALES_CT',
      revision: 'STAGE.REVISION',
      pre_draft_review: 'STAGE.PRE_DRAFT_REVIEW',
      cutting: 'STAGE.CUTTING',
      Edging: 'STAGE.EDGING',
      cut_list: 'STAGE.CUT_LIST',
    };

    const translationKey = stageMap[stageKey] || `STAGE.${stageKey.toUpperCase()}`;
    return intl.formatMessage({ id: translationKey, defaultMessage: stageKey });
  };

  // Helper function to translate file type names
  const translateFileType = (fileTypeKey: string) => {
    const fileTypeMap: Record<string, string> = {
      block_drawing: 'FILE_TYPE.BLOCK_DRAWING',
      layout: 'FILE_TYPE.LAYOUT',
      ss_layout: 'FILE_TYPE.SS_LAYOUT',
      shop_drawing: 'FILE_TYPE.SHOP_DRAWING',
      photo_media: 'FILE_TYPE.PHOTO_MEDIA',
    };

    const translationKey = fileTypeMap[fileTypeKey] || `FILE_TYPE.${fileTypeKey.toUpperCase()}`;
    return intl.formatMessage({ id: translationKey, defaultMessage: fileTypeKey });
  };

  // Helper function to translate file labels
  const translateFileLabel = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return intl.formatMessage({ id: 'FILE_TYPE.PHOTO', defaultMessage: 'Photo' });
    }
    if (fileType.startsWith('video/')) {
      return intl.formatMessage({ id: 'FILE_TYPE.VIDEO', defaultMessage: 'Video' });
    }
    return intl.formatMessage({ id: 'FILE_TYPE.DOCUMENT', defaultMessage: 'Document' });
  };

  return {
    t: (key: string, values?: Record<string, any>) => 
      intl.formatMessage({ id: key }, values),
    translateStage,
    translateFileType,
    translateFileLabel,
    locale: intl.locale,
  };
};
