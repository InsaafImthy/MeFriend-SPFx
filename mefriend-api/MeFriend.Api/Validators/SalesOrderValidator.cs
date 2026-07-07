using MeFriend.Api.Models.Common;
using MeFriend.Api.Models.SalesOrders;

namespace MeFriend.Api.Validators;

public static class SalesOrderValidator
{
    public static IReadOnlyCollection<ApiError> ValidateCreate(SalesOrderCreateRequest request)
    {
        var errors = new List<ApiError>();

        if (string.IsNullOrWhiteSpace(request.CustomerCode))
        {
            errors.Add(new ApiError("CustomerCodeRequired", "Customer code is required.", nameof(request.CustomerCode)));
        }

        if (request.Lines.Count == 0)
        {
            errors.Add(new ApiError("SalesOrderLinesRequired", "At least one line item is required.", nameof(request.Lines)));
        }

        return errors;
    }
}
