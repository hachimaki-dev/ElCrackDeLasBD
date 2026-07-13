interface WebviewApi<T> {
  postMessage(message: T): void;
  getState(): T | undefined;
  setState(state: T): T;
}

declare const acquireVsCodeApi: <T = any>() => WebviewApi<T>;

class VSCodeWrapper {
  private readonly vscodeApi: WebviewApi<any> | undefined;

  constructor() {
    if (typeof acquireVsCodeApi !== 'undefined') {
      try {
        this.vscodeApi = acquireVsCodeApi();
      } catch (error) {
        console.error('Error acquiring VS Code API:', error);
      }
    }
  }

  public postMessage(message: any) {
    if (this.vscodeApi) {
      this.vscodeApi.postMessage(message);
    } else {
      console.log('Mock postMessage:', message);
    }
  }

  public getState(): any {
    if (this.vscodeApi) {
      return this.vscodeApi.getState();
    }
    return undefined;
  }

  public setState(state: any): any {
    if (this.vscodeApi) {
      return this.vscodeApi.setState(state);
    }
    return state;
  }
}

export const vscode = new VSCodeWrapper();
