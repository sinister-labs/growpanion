"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Download,
    Upload,
    Lock,
    Unlock,
    FileJson,
    Shield,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    Eye,
    EyeOff,
    FileText,
    Database,
    Leaf,
    FlaskConical,
    Settings,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
    createExportFile,
    downloadFile,
    parseImportFile,
    importData,
    readFileAsText,
    detectFileType,
    getExportSummary,
    ExportData,
    ConflictStrategy,
    ImportResult
} from '@/lib/export-import';

type ExportImportStep = 'idle' | 'exporting' | 'export-complete' | 'file-selected' | 'password-required' | 'preview' | 'importing' | 'import-complete';

export function ExportImportSection() {
    const { toast } = useToast();
    
    // Export state
    const [exportDialogOpen, setExportDialogOpen] = useState(false);
    const [exportPassword, setExportPassword] = useState('');
    const [exportPasswordConfirm, setExportPasswordConfirm] = useState('');
    const [exportEncrypted, setExportEncrypted] = useState(false);
    const [exportDescription, setExportDescription] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [showExportPassword, setShowExportPassword] = useState(false);

    // Import state
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importStep, setImportStep] = useState<ExportImportStep>('idle');
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importFileContent, setImportFileContent] = useState<string>('');
    const [importPassword, setImportPassword] = useState('');
    const [showImportPassword, setShowImportPassword] = useState(false);
    const [importPreviewData, setImportPreviewData] = useState<ExportData | null>(null);
    const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('merge');
    const [importProgress, setImportProgress] = useState(0);
    const [importProgressMessage, setImportProgressMessage] = useState('');
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [importError, setImportError] = useState<string>('');

    // File dropzone
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;
        
        const file = acceptedFiles[0];
        setImportFile(file);
        setImportError('');
        
        try {
            const content = await readFileAsText(file);
            setImportFileContent(content);
            
            const fileType = detectFileType(file.name, content);
            
            if (fileType === 'unknown') {
                setImportError('Unrecognized file format. Please use a valid GrowPanion export file.');
                setImportStep('idle');
                return;
            }
            
            if (fileType === 'encrypted') {
                setImportStep('password-required');
            } else {
                // Try to parse and preview
                try {
                    const parsed = await parseImportFile(content);
                    setImportPreviewData(parsed.data);
                    setImportStep('preview');
                } catch (error) {
                    if (error instanceof Error) {
                        setImportError(getErrorMessage(error.message));
                    }
                    setImportStep('idle');
                }
            }
        } catch {
            setImportError('Failed to read file');
            setImportStep('idle');
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/json': ['.json'],
            'application/octet-stream': ['.growpanion']
        },
        maxFiles: 1
    });

    // Export handlers
    const handleExport = async () => {
        if (exportEncrypted && exportPassword !== exportPasswordConfirm) {
            toast({
                variant: "destructive",
                title: "Password mismatch",
                description: "The passwords do not match."
            });
            return;
        }

        if (exportEncrypted && exportPassword.length < 8) {
            toast({
                variant: "destructive",
                title: "Password too short",
                description: "Password must be at least 8 characters."
            });
            return;
        }

        setIsExporting(true);
        try {
            const { content, filename, encrypted } = await createExportFile(
                exportEncrypted ? exportPassword : undefined,
                exportDescription || undefined
            );
            
            downloadFile(content, filename);
            
            toast({
                variant: "success",
                title: "Export successful!",
                description: `Your data has been exported${encrypted ? ' and encrypted' : ''}.`
            });
            
            resetExportState();
            setExportDialogOpen(false);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Export failed",
                description: error instanceof Error ? error.message : "Unknown error"
            });
        } finally {
            setIsExporting(false);
        }
    };

    const resetExportState = () => {
        setExportPassword('');
        setExportPasswordConfirm('');
        setExportEncrypted(false);
        setExportDescription('');
        setShowExportPassword(false);
    };

    // Import handlers
    const handleDecryptAndPreview = async () => {
        if (!importPassword) {
            setImportError('Please enter the password');
            return;
        }

        try {
            const parsed = await parseImportFile(importFileContent, importPassword);
            setImportPreviewData(parsed.data);
            setImportError('');
            setImportStep('preview');
        } catch (error) {
            if (error instanceof Error) {
                setImportError(getErrorMessage(error.message));
            }
        }
    };

    const handleImport = async () => {
        if (!importPreviewData) return;

        setImportStep('importing');
        setImportProgress(0);
        
        try {
            const result = await importData(
                importPreviewData,
                conflictStrategy,
                (progress, message) => {
                    setImportProgress(progress);
                    setImportProgressMessage(message);
                }
            );
            
            setImportResult(result);
            setImportStep('import-complete');
            
            if (result.success) {
                toast({
                    variant: "success",
                    title: "Import successful!",
                    description: `Imported ${result.imported.grows} grows, ${result.imported.plants} plants, ${result.imported.fertilizerMixes} mixes.`
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Import completed with errors",
                    description: result.errors.join(', ')
                });
            }
        } catch (error) {
            setImportError(error instanceof Error ? error.message : 'Import failed');
            setImportStep('preview');
        }
    };

    const resetImportState = () => {
        setImportStep('idle');
        setImportFile(null);
        setImportFileContent('');
        setImportPassword('');
        setShowImportPassword(false);
        setImportPreviewData(null);
        setConflictStrategy('merge');
        setImportProgress(0);
        setImportProgressMessage('');
        setImportResult(null);
        setImportError('');
    };

    const getErrorMessage = (errorCode: string): string => {
        switch (errorCode) {
            case 'ENCRYPTED_FILE_NEEDS_PASSWORD':
                return 'This file is encrypted. Please enter the password.';
            case 'DECRYPTION_FAILED':
                return 'Decryption failed. Please check your password.';
            case 'INVALID_JSON':
                return 'Invalid file format. The file is not valid JSON.';
            default:
                if (errorCode.startsWith('INVALID_SCHEMA:')) {
                    return `Invalid file structure: ${errorCode.replace('INVALID_SCHEMA: ', '')}`;
                }
                return errorCode;
        }
    };

    const summary = importPreviewData ? getExportSummary(importPreviewData) : null;

    return (
        <Card className="bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-lg border-gray-700 text-left">
            <CardHeader>
                <CardTitle className="text-base sm:text-lg font-medium text-green-400">
                    <div>
                        <p className="font-semibold">Data Backup & Restore</p>
                        <CardDescription className="text-gray-400">
                            Export your data for backup or transfer to another device
                        </CardDescription>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                        onClick={() => setExportDialogOpen(true)}
                        className="flex-1 bg-green-700 hover:bg-green-600 text-white rounded-full transition-colors"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Export Data
                    </Button>
                    <Button
                        onClick={() => setImportDialogOpen(true)}
                        variant="outline"
                        className="flex-1 border-gray-600 hover:bg-gray-600/30 text-gray-300 rounded-full transition-colors"
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Import Data
                    </Button>
                </div>

                <div className="mt-4 p-4 bg-blue-900/30 border border-blue-800 rounded-2xl flex items-start">
                    <Shield className="h-5 w-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-300">
                        <p className="mb-1">Your data stays on your device and is never uploaded to any server.</p>
                        <p>For extra security, you can encrypt your backups with a password.</p>
                    </div>
                </div>

                {/* Export Dialog */}
                <Dialog open={exportDialogOpen} onOpenChange={(open) => {
                    setExportDialogOpen(open);
                    if (!open) resetExportState();
                }}>
                    <DialogContent className="bg-gray-800 border-gray-700 text-white sm:max-w-[500px] rounded-xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Download className="h-5 w-5 text-green-400" />
                                Export Data
                            </DialogTitle>
                            <DialogDescription className="text-gray-400">
                                Create a backup of all your GrowPanion data
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            {/* Description */}
                            <div className="space-y-2">
                                <Label htmlFor="export-desc" className="text-gray-300">Description (optional)</Label>
                                <Input
                                    id="export-desc"
                                    value={exportDescription}
                                    onChange={(e) => setExportDescription(e.target.value)}
                                    placeholder="e.g., Before major changes..."
                                    className="bg-gray-700 border-gray-600 text-white"
                                />
                            </div>

                            {/* Encryption toggle */}
                            <div className="flex items-center space-x-3 p-4 bg-gray-700/50 rounded-xl">
                                <Checkbox
                                    id="encrypt"
                                    checked={exportEncrypted}
                                    onCheckedChange={(checked) => setExportEncrypted(checked === true)}
                                    className="border-gray-500 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                />
                                <div className="flex-1">
                                    <Label htmlFor="encrypt" className="text-gray-200 cursor-pointer flex items-center gap-2">
                                        <Lock className="h-4 w-4" />
                                        Encrypt backup with password
                                    </Label>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Protects your data if the file is accessed by others
                                    </p>
                                </div>
                            </div>

                            {/* Password fields */}
                            {exportEncrypted && (
                                <div className="space-y-4 p-4 bg-gray-700/30 rounded-xl border border-gray-600">
                                    <div className="space-y-2">
                                        <Label htmlFor="export-pwd" className="text-gray-300">Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="export-pwd"
                                                type={showExportPassword ? "text" : "password"}
                                                value={exportPassword}
                                                onChange={(e) => setExportPassword(e.target.value)}
                                                placeholder="Min. 8 characters"
                                                className="bg-gray-700 border-gray-600 text-white pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowExportPassword(!showExportPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                            >
                                                {showExportPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="export-pwd-confirm" className="text-gray-300">Confirm Password</Label>
                                        <Input
                                            id="export-pwd-confirm"
                                            type={showExportPassword ? "text" : "password"}
                                            value={exportPasswordConfirm}
                                            onChange={(e) => setExportPasswordConfirm(e.target.value)}
                                            placeholder="Repeat password"
                                            className="bg-gray-700 border-gray-600 text-white"
                                        />
                                    </div>
                                    {exportPassword && exportPasswordConfirm && exportPassword !== exportPasswordConfirm && (
                                        <Alert variant="destructive" className="bg-red-900/30 border-red-800">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>Passwords do not match</AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            )}

                            {/* File info */}
                            <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-xl">
                                {exportEncrypted ? (
                                    <Lock className="h-5 w-5 text-amber-400" />
                                ) : (
                                    <FileJson className="h-5 w-5 text-blue-400" />
                                )}
                                <div className="text-sm">
                                    <p className="text-gray-200">
                                        {exportEncrypted ? 'Encrypted file (.growpanion)' : 'JSON file (.json)'}
                                    </p>
                                    <p className="text-gray-400 text-xs">
                                        {exportEncrypted 
                                            ? 'AES-256-GCM encryption, requires password to restore'
                                            : 'Human-readable, can be opened in any text editor'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setExportDialogOpen(false)}
                                className="border-gray-600 hover:bg-gray-600/30 text-gray-300 rounded-full"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleExport}
                                disabled={isExporting || (exportEncrypted && (exportPassword.length < 8 || exportPassword !== exportPasswordConfirm))}
                                className="bg-green-700 hover:bg-green-600 text-white rounded-full"
                            >
                                {isExporting ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Exporting...
                                    </>
                                ) : (
                                    <>
                                        <Download className="mr-2 h-4 w-4" />
                                        Export
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Import Dialog */}
                <Dialog open={importDialogOpen} onOpenChange={(open) => {
                    setImportDialogOpen(open);
                    if (!open) resetImportState();
                }}>
                    <DialogContent className="bg-gray-800 border-gray-700 text-white sm:max-w-[600px] rounded-xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Upload className="h-5 w-5 text-blue-400" />
                                Import Data
                            </DialogTitle>
                            <DialogDescription className="text-gray-400">
                                Restore data from a GrowPanion backup file
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-4">
                            {/* Step: File Selection */}
                            {(importStep === 'idle' || importStep === 'file-selected') && (
                                <div className="space-y-4">
                                    <div
                                        {...getRootProps()}
                                        className={`
                                            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                                            ${isDragActive 
                                                ? 'border-green-500 bg-green-500/10' 
                                                : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/30'
                                            }
                                        `}
                                    >
                                        <input {...getInputProps()} />
                                        <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragActive ? 'text-green-400' : 'text-gray-400'}`} />
                                        {isDragActive ? (
                                            <p className="text-green-400">Drop the file here...</p>
                                        ) : (
                                            <>
                                                <p className="text-gray-300 mb-1">Drag & drop a backup file here</p>
                                                <p className="text-gray-500 text-sm">or click to select a file</p>
                                                <p className="text-gray-500 text-xs mt-2">Supports .json and .growpanion files</p>
                                            </>
                                        )}
                                    </div>

                                    {importError && (
                                        <Alert variant="destructive" className="bg-red-900/30 border-red-800">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{importError}</AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            )}

                            {/* Step: Password Required */}
                            {importStep === 'password-required' && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-4 bg-amber-900/30 border border-amber-700 rounded-xl">
                                        <Lock className="h-5 w-5 text-amber-400" />
                                        <div>
                                            <p className="text-amber-200 font-medium">Encrypted File</p>
                                            <p className="text-amber-300/70 text-sm">
                                                This backup is password-protected. Enter the password to continue.
                                            </p>
                                        </div>
                                    </div>

                                    {importFile && (
                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                            <FileText className="h-4 w-4" />
                                            {importFile.name}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="import-pwd" className="text-gray-300">Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="import-pwd"
                                                type={showImportPassword ? "text" : "password"}
                                                value={importPassword}
                                                onChange={(e) => setImportPassword(e.target.value)}
                                                placeholder="Enter backup password"
                                                className="bg-gray-700 border-gray-600 text-white pr-10"
                                                onKeyDown={(e) => e.key === 'Enter' && handleDecryptAndPreview()}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowImportPassword(!showImportPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                            >
                                                {showImportPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {importError && (
                                        <Alert variant="destructive" className="bg-red-900/30 border-red-800">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{importError}</AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={resetImportState}
                                            className="border-gray-600 hover:bg-gray-600/30 text-gray-300 rounded-full"
                                        >
                                            <X className="mr-2 h-4 w-4" />
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleDecryptAndPreview}
                                            disabled={!importPassword}
                                            className="bg-blue-700 hover:bg-blue-600 text-white rounded-full"
                                        >
                                            <Unlock className="mr-2 h-4 w-4" />
                                            Decrypt & Preview
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step: Preview */}
                            {importStep === 'preview' && summary && (
                                <div className="space-y-4">
                                    {/* File info */}
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <FileText className="h-4 w-4" />
                                        {importFile?.name}
                                        <span className="text-gray-500">•</span>
                                        <span>Exported {new Date(summary.exportDate).toLocaleDateString()}</span>
                                    </div>

                                    {/* Summary */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-gray-700/50 rounded-xl flex items-center gap-3">
                                            <Database className="h-5 w-5 text-green-400" />
                                            <div>
                                                <p className="text-lg font-semibold text-white">{summary.grows}</p>
                                                <p className="text-xs text-gray-400">Grows</p>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-gray-700/50 rounded-xl flex items-center gap-3">
                                            <Leaf className="h-5 w-5 text-green-400" />
                                            <div>
                                                <p className="text-lg font-semibold text-white">{summary.plants}</p>
                                                <p className="text-xs text-gray-400">Plants</p>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-gray-700/50 rounded-xl flex items-center gap-3">
                                            <FlaskConical className="h-5 w-5 text-blue-400" />
                                            <div>
                                                <p className="text-lg font-semibold text-white">{summary.fertilizerMixes}</p>
                                                <p className="text-xs text-gray-400">Fertilizer Mixes</p>
                                            </div>
                                        </div>
                                        <div className="p-3 bg-gray-700/50 rounded-xl flex items-center gap-3">
                                            <Settings className="h-5 w-5 text-purple-400" />
                                            <div>
                                                <p className="text-lg font-semibold text-white">{summary.hasSettings ? 'Yes' : 'No'}</p>
                                                <p className="text-xs text-gray-400">Settings</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Conflict strategy */}
                                    <div className="space-y-2">
                                        <Label className="text-gray-300">If data already exists:</Label>
                                        <Select value={conflictStrategy} onValueChange={(v) => setConflictStrategy(v as ConflictStrategy)}>
                                            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gray-800 border-gray-700">
                                                <SelectItem value="merge" className="text-white hover:bg-gray-700">
                                                    Merge - Keep existing, add new
                                                </SelectItem>
                                                <SelectItem value="replace" className="text-white hover:bg-gray-700">
                                                    Replace All - Delete existing, import all
                                                </SelectItem>
                                                <SelectItem value="skip" className="text-white hover:bg-gray-700">
                                                    Skip Duplicates - Only import new items
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-gray-500">
                                            {conflictStrategy === 'merge' && 'Existing items with the same ID will be updated, new items will be added.'}
                                            {conflictStrategy === 'replace' && '⚠️ All existing data will be deleted before import!'}
                                            {conflictStrategy === 'skip' && 'Items with existing IDs will be skipped, only new items will be imported.'}
                                        </p>
                                    </div>

                                    {conflictStrategy === 'replace' && (
                                        <Alert variant="destructive" className="bg-red-900/30 border-red-800">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>
                                                Warning: This will delete all your current data before importing!
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            variant="outline"
                                            onClick={resetImportState}
                                            className="border-gray-600 hover:bg-gray-600/30 text-gray-300 rounded-full"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleImport}
                                            className="bg-green-700 hover:bg-green-600 text-white rounded-full flex-1"
                                        >
                                            <Upload className="mr-2 h-4 w-4" />
                                            Import Data
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step: Importing */}
                            {importStep === 'importing' && (
                                <div className="space-y-4 py-8">
                                    <div className="text-center">
                                        <RefreshCw className="h-12 w-12 mx-auto mb-4 text-blue-400 animate-spin" />
                                        <p className="text-lg text-gray-200 mb-2">Importing data...</p>
                                        <p className="text-sm text-gray-400">{importProgressMessage}</p>
                                    </div>
                                    <Progress value={importProgress} className="h-2" />
                                    <p className="text-center text-sm text-gray-400">{importProgress}%</p>
                                </div>
                            )}

                            {/* Step: Import Complete */}
                            {importStep === 'import-complete' && importResult && (
                                <div className="space-y-4">
                                    <div className="text-center py-4">
                                        {importResult.success ? (
                                            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-400" />
                                        ) : (
                                            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-amber-400" />
                                        )}
                                        <p className="text-xl font-semibold text-white mb-2">
                                            {importResult.success ? 'Import Complete!' : 'Import Completed with Warnings'}
                                        </p>
                                    </div>

                                    {/* Results summary */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3 bg-green-900/30 border border-green-800 rounded-xl text-center">
                                            <p className="text-2xl font-bold text-green-400">{importResult.imported.grows}</p>
                                            <p className="text-xs text-green-300">Grows imported</p>
                                        </div>
                                        <div className="p-3 bg-green-900/30 border border-green-800 rounded-xl text-center">
                                            <p className="text-2xl font-bold text-green-400">{importResult.imported.plants}</p>
                                            <p className="text-xs text-green-300">Plants imported</p>
                                        </div>
                                        <div className="p-3 bg-green-900/30 border border-green-800 rounded-xl text-center">
                                            <p className="text-2xl font-bold text-green-400">{importResult.imported.fertilizerMixes}</p>
                                            <p className="text-xs text-green-300">Mixes imported</p>
                                        </div>
                                    </div>

                                    {(importResult.skipped.grows > 0 || importResult.skipped.plants > 0 || importResult.skipped.fertilizerMixes > 0) && (
                                        <div className="p-3 bg-gray-700/50 rounded-xl">
                                            <p className="text-sm text-gray-400">
                                                Skipped: {importResult.skipped.grows} grows, {importResult.skipped.plants} plants, {importResult.skipped.fertilizerMixes} mixes
                                            </p>
                                        </div>
                                    )}

                                    {importResult.errors.length > 0 && (
                                        <Alert variant="destructive" className="bg-red-900/30 border-red-800">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>
                                                {importResult.errors.join(', ')}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <Button
                                        onClick={() => {
                                            setImportDialogOpen(false);
                                            resetImportState();
                                            // Trigger page reload to show new data
                                            window.location.reload();
                                        }}
                                        className="w-full bg-green-700 hover:bg-green-600 text-white rounded-full"
                                    >
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Done
                                    </Button>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
