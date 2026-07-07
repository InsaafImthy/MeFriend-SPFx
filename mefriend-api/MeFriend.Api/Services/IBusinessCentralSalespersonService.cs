using MeFriend.Api.Models.Common;
using MeFriend.Api.Models.Salespersons;

namespace MeFriend.Api.Services;

public interface IBusinessCentralSalespersonService
{
    Task<ApiResponse<PagedResult<SalespersonListItemDto>>> GetSalespersonsAsync(
        SalespersonFilterRequest request,
        CancellationToken cancellationToken);
    Task<ApiResponse<SalespersonDetailDto>> GetSalespersonByIdAsync(string id, CancellationToken cancellationToken);
}
