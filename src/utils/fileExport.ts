import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

export interface ExportResult {
  success: boolean;
  filename: string;
  uri?: string;
  error?: string;
}

export interface PickedFileResult {
  cancelled: boolean;
  filename?: string;
  content?: string;
  error?: string;
}

/**
 * Saves and shares or downloads a text payload (JSON / CSV)
 */
export async function exportFile(
  content: string,
  filename: string,
  mimeType: string
): Promise<ExportResult> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return { success: true, filename };
      }
      return { success: false, filename, error: 'Web environment does not support downloads' };
    }

    // Native Android / iOS
    const targetUri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(targetUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Verification check: ensure file was actually written before proceeding
    const fileInfo = await FileSystem.getInfoAsync(targetUri);
    if (!fileInfo.exists) {
      return { success: false, filename, error: 'Failed to verify written export file on device storage.' };
    }

    // Share / Save via system document picker dialog
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(targetUri, {
        mimeType,
        dialogTitle: `Save ${filename}`,
        UTI: mimeType === 'application/json' ? 'public.json' : 'public.comma-separated-values-text',
      });
      return { success: true, filename, uri: targetUri };
    }

    return {
      success: true,
      filename,
      uri: targetUri,
      error: 'File saved locally to cache, but system sharing is not supported on this device.',
    };
  } catch (err: any) {
    return {
      success: false,
      filename,
      error: err?.message || 'An unexpected error occurred during export.',
    };
  }
}

/**
 * Prompts user to pick a backup file and reads its text content
 * Accepts only standard .json backup files
 */
export async function pickAndReadFile(
  mimeTypes: string[] = ['application/json', 'text/json', 'text/plain', '*/*']
): Promise<PickedFileResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: mimeTypes,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { cancelled: true };
    }

    const asset = result.assets[0];
    const filename = asset.name || '';
    const ext = filename.toLowerCase().split('.').pop();

    if (ext !== 'json') {
      return {
        cancelled: false,
        filename,
        error: `Unsupported file type (.${ext}). Only standard .json backup files can be imported.`,
      };
    }

    let content = '';

    if (Platform.OS === 'web') {
      if (asset.file && typeof asset.file.text === 'function') {
        content = await asset.file.text();
      } else {
        const res = await fetch(asset.uri);
        content = await res.text();
      }
    } else {
      content = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    }

    return {
      cancelled: false,
      filename,
      content,
    };
  } catch (err: any) {
    return {
      cancelled: false,
      error: err?.message || 'Failed to read the selected file.',
    };
  }
}
