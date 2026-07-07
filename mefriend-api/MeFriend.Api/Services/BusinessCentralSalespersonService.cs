using MeFriend.Api.Models.Common;
using MeFriend.Api.Models.Salespersons;

namespace MeFriend.Api.Services;

public sealed class BusinessCentralSalespersonService : IBusinessCentralSalespersonService
{
    public Task<ApiResponse<PagedResult<SalespersonListItemDto>>> GetSalespersonsAsync(
        SalespersonFilterRequest request,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(ApiResponse<PagedResult<SalespersonListItemDto>>.Fail(
            "SalespersonApiPending",
            "Business Central API contract for this operation is not configured yet."));
    }

    public Task<ApiResponse<SalespersonDetailDto>> GetSalespersonByIdAsync(string id, CancellationToken cancellationToken)
    {
        return Task.FromResult(ApiResponse<SalespersonDetailDto>.Fail(
            "SalespersonApiPending",
            "Business Central API contract for this operation is not configured yet."));
    }
}
