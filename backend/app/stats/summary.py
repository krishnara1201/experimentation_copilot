from app.stats.stat_analysis import calculate_result_significance, calculate_result_ci, calculate_srm, calculate_uplift, calculate_result_p_value, test_type, uplift_mode

class decision_summary:
    def __init__(self, p1: float, p2: float, n1: int, n2: int, alpha: float = 0.05, mode: uplift_mode = uplift_mode.ABSOLUTE, test_type: test_type = test_type.TWO_SIDED):
        self.p1 = p1
        self.p2 = p2
        self.n1 = n1
        self.n2 = n2
        self.alpha = alpha
        self.mode = mode
        self.test_type = test_type
    
        # initialize the decision summary
        self.summary = self.generate_summary()

    def generate_summary(self) -> dict:
        """
        Generate a decision summary for an A/B test based on the provided parameters.

        Returns:
            dict: A dictionary containing the decision summary.
        """
        # Calculate significance
        is_significant = calculate_result_significance(self.p1, self.p2, self.n1, self.n2, self.alpha, self.test_type)

        # Calculate p-value
        p_value = calculate_result_p_value(self.p1, self.p2, self.n1, self.n2, self.test_type)

        # Calculate confidence interval
        ci_lower, ci_upper = calculate_result_ci(self.p1, self.p2, self.n1, self.n2, self.alpha, self.test_type)

        # Calculate uplift
        uplift = calculate_uplift(self.p1, self.p2, self.mode)

        # Calculate SRM
        srm_p_value = calculate_srm(self.p1, self.p2, self.n1, self.n2, self.alpha)

        # Generate decision summary
        decision_summary = {
            "is_significant": is_significant,
            "p_value": p_value,
            "confidence_interval": {
                "lower": ci_lower,
                "upper": ci_upper
            },
            "uplift": uplift,
            "srm_p_value": srm_p_value
        }

        return decision_summary

    def generate_summary_text(self) -> str:
        """
        Generate a textual summary based on the decision summary.

        Args:
            decision_summary (dict): A dictionary containing the decision summary.

        Returns:
            str: A textual summary of the decision.
        """
        if self.summary["srm_p_value"] < 0.05:
            return "Sample Ratio Mismatch (SRM) detected. The allocation of samples between groups may be biased. Further Investigation is needed."
        
        if self.summary["ci_lower"] <= 0 and self.summary["ci_upper"] >= 0 or self.summary["p_value"] > self.alpha:
            return "The confidence interval includes zero or p-value is greater than the specified alpha value, indicating that the difference between the two groups is not statistically significant. No conclusive decision can be made."

        if self.summary["is_significant"]:
            if self.summary["uplift"] > 0:
                return "The results are statistically significant, and the treatment group shows a positive effect compared to the control group. The treatment is likely beneficial."
            else:
                return "The results are statistically significant, but the treatment group shows a negative effect compared to the control group. The treatment may be harmful."
        else:
            return "The results are not statistically significant, indicating that there is no clear evidence of a difference between the two groups. Further investigation may be needed."