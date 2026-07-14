import * as vscode from 'vscode';
import { DockerClient } from '../core/docker/dockerClient';
import { ContainerLifecycle } from '../core/docker/containerLifecycle';
import { ProgressManager } from '../core/progress/progressManager';
export type HomeState = 'checking_docker' | 'docker_not_installed' | 'docker_not_running' | 'starting_docker' | 'pulling_images' | 'ready';
export declare class HomePanel {
    private static currentPanel;
    private readonly panel;
    private readonly dockerClient;
    private readonly extensionUri;
    private readonly lifecycle;
    private readonly progressManager;
    private currentState;
    private pullProgress?;
    private isPolling;
    private currentMessage?;
    private readonly onReadyCallback?;
    private constructor();
    static createOrShow(extensionUri: vscode.Uri, dockerClient: DockerClient, lifecycle: ContainerLifecycle, progressManager: ProgressManager, onReady?: () => void): void;
    static refresh(): void;
    /**
     * Envía el reporte de la autocalificación al Webview React activo.
     */
    static sendValidationResult(report: any): void;
    private loadTutorials;
    private runSetupFlow;
    private handleStartDocker;
    private pollDockerUntilRunning;
    private checkOracleAndFinish;
    private setState;
    private updateWebviewState;
    private buildHtml;
}
//# sourceMappingURL=homePanel.d.ts.map