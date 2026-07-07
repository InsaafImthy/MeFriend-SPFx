using MeFriend.Api.Models.Common;
using MeFriend.Api.Models.Customers;

namespace MeFriend.Api.Validators;

public static class CustomerValidator
{
    public static IReadOnlyCollection<ApiError> ValidateCreate(CustomerCreateRequest request)
    {
        var errors = new List<ApiError>();

        AddRequiredError(errors, request.Branch, nameof(request.Branch), "Branch is required.");
        if (!string.IsNullOrWhiteSpace(request.Branch)
            && !CustomerConstants.AllowedBranches.Contains(request.Branch))
        {
            errors.Add(new ApiError(
                "InvalidBranch",
                "Branch must be one of CLT, MPM, TVM, TSR, CHN, KTM, CORP, KNR.",
                nameof(request.Branch)));
        }

        AddRequiredError(errors, request.Department, nameof(request.Department), "Department is required.");
        if (!string.IsNullOrWhiteSpace(request.Department)
            && !CustomerConstants.AllowedDepartments.Contains(request.Department))
        {
            errors.Add(new ApiError(
                "InvalidDepartment",
                "Department must be CIR or ADVT.",
                nameof(request.Department)));
        }

        if (string.IsNullOrWhiteSpace(request.CustomerCode))
        {
            errors.Add(new ApiError("CustomerCodeRequired", "Customer code is required.", nameof(request.CustomerCode)));
        }

        if (string.IsNullOrWhiteSpace(request.CustomerName))
        {
            errors.Add(new ApiError("CustomerNameRequired", "Customer name is required.", nameof(request.CustomerName)));
        }

        AddRequiredError(errors, request.Address, nameof(request.Address), "Address is required.");
        AddRequiredError(errors, request.StateCode, nameof(request.StateCode), "State code is required.");
        AddRequiredError(errors, request.CountryCode, nameof(request.CountryCode), "Country code is required.");
        AddRequiredError(errors, request.City, nameof(request.City), "City is required.");
        AddRequiredError(errors, request.PostCode, nameof(request.PostCode), "Post code is required.");
        AddRequiredError(errors, request.LocationCode, nameof(request.LocationCode), "Location code is required.");

        return errors;
    }

    private static void AddRequiredError(
        ICollection<ApiError> errors,
        string value,
        string fieldName,
        string message)
    {
        if (!string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        errors.Add(new ApiError($"{fieldName}Required", message, fieldName));
    }
}
