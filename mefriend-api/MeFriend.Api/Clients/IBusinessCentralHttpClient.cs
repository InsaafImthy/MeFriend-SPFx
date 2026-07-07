namespace MeFriend.Api.Clients;

public interface IBusinessCentralHttpClient
{
    Task<TResponse?> GetAsync<TResponse>(string relativeOrAbsoluteUrl, CancellationToken cancellationToken);
    Task<TResponse?> PostAsync<TRequest, TResponse>(
        string relativeOrAbsoluteUrl,
        TRequest payload,
        CancellationToken cancellationToken);
    Task<TResponse?> PutAsync<TRequest, TResponse>(
        string relativeOrAbsoluteUrl,
        TRequest payload,
        CancellationToken cancellationToken);
    Task<TResponse?> PatchAsync<TRequest, TResponse>(
        string relativeOrAbsoluteUrl,
        TRequest payload,
        CancellationToken cancellationToken);
    Task DeleteAsync(string relativeOrAbsoluteUrl, CancellationToken cancellationToken);
}
